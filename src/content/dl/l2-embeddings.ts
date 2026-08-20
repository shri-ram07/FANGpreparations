import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-embeddings',
  subjectId: 'dl',
  level: 2,
  title: 'Embeddings: Meaning as Vectors',
  whyItMatters:
    'A neural network can only add and multiply numbers. Text is made of words. Embeddings are the bridge: every model that reads text, every search box that understands "cheap flights" and "budget airfare" mean the same thing, starts by turning words into short lists of numbers where being close means being related. This module builds that idea from zero, by hand.',
  assumes: [
    'You can read a Python for loop, a list, and a dictionary',
    'You know what a square root is',
    'Helpful but not required: the Math module Vectors & the Dot Product (= Similarity)',
  ],
  estMinutes: 33,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: a network eats numbers, and a word is not a number',
      md: `A neural network multiplies numbers and adds them up. That is all it does. So before any model can read the sentence "the cat sat", something has to turn the word "cat" into numbers.

- A **vocabulary** is the fixed list of words a model is allowed to see. Ours will be tiny: cat, dog, sat, helicopter.
- A **token** is one item from that vocabulary — for us, one word. (Real systems split rarer words into pieces, but that is a separate topic.)
- So the question of this whole module is: what numbers do we hand the network for the token "cat"?
- The first answer everyone invents is one-hot encoding. We will build it, watch it fail, and the way it fails tells us exactly what to build instead.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Attempt 1: one-hot encoding, built by hand',
      code: `vocab = ['cat', 'dog', 'sat', 'helicopter']   # our whole "language": 4 words

def one_hot(word):                            # turn one word into a list of numbers
    row = [0] * len(vocab)                    # start with one zero per vocabulary word
    row[vocab.index(word)] = 1                # index() gives the word's position; put a 1 there
    return row                                # hand back the finished list

print('cat        ->', one_hot('cat'))          # show the vector for cat
print('dog        ->', one_hot('dog'))          # and for dog
print('helicopter ->', one_hot('helicopter'))   # and for helicopter

# ---- real output ----
# cat        -> [1, 0, 0, 0]
# dog        -> [0, 1, 0, 0]
# helicopter -> [0, 0, 0, 1]`,
      annotations: {
        1: 'The vocabulary is just a list, and a word\'s position in that list becomes its id number. cat is id 0, dog is id 1, sat is 2, helicopter is 3.',
        4: '[0] * 4 makes the list [0, 0, 0, 0]. Multiplying a list by a number repeats it — this is list repetition, not arithmetic.',
        5: 'A one-hot vector is a list that is all zeros except a single 1, sitting in the slot that belongs to this word. "One hot" means exactly one slot is switched on.',
      },
    },
    {
      type: 'intuition',
      title: 'Failure 1: it is enormous',
      md: `Look at the actual vectors. Four words, four numbers each, three of them zero.

- Now scale it. A real vocabulary has about 50,000 words, so "cat" becomes a list of 50,000 numbers with one 1 in it.
- That is 49,999 zeros carried around for every single token in every sentence.
- The first layer of the network then needs a weight for each of those 50,000 inputs, most of which are always zero.
- Wasteful, but survivable. The second failure is the one that kills it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Failure 2: every pair of different words is equally far apart',
      code: `cat = [1, 0, 0, 0]          # one-hot for cat
dog = [0, 1, 0, 0]          # one-hot for dog
helicopter = [0, 0, 0, 1]   # one-hot for helicopter

def dot(a, b):              # dot product: multiply slot by slot, then add it all up
    total = 0.0             # running sum starts empty
    for i in range(len(a)): # walk both lists position by position
        total += a[i] * b[i]
    return total            # one number: how much the two lists overlap

print('cat . dog        =', dot(cat, dog))
print('cat . helicopter =', dot(cat, helicopter))   # a totally unrelated pair
print('cat . cat        =', dot(cat, cat))

# ---- real output ----
# cat . dog        = 0.0
# cat . helicopter = 0.0
# cat . cat        = 1.0`,
      annotations: {
        8: 'This is the only line doing arithmetic: multiply the numbers in slot i and add the product to the running total.',
        11: 'cat has its 1 in slot 0, dog has its 1 in slot 1. Every product is 1 times 0 or 0 times something, so the total is 0.',
        13: 'A word compared with itself gives 1 — the only pair that is not 0. So the dot product here answers "same word or not", nothing more.',
      },
    },
    {
      type: 'intuition',
      title: 'What that zero means',
      md: `The dot product is our closeness score: bigger means more alike. One-hot gives 0 for **every** pair of different words.

- cat and dog score 0. cat and helicopter score 0. The same number.
- So in this representation, "cat" is no closer to "dog" than it is to "helicopter".
- Measured as distance instead of overlap, every distinct pair sits exactly the square root of 2 apart — the same distance, always.
- The encoding stores identity and nothing else. It is a set of id numbers wearing a vector costume.
- A model given these has to learn every fact about every word from scratch, with no help from the fact that cats and dogs are both animals.`,
    },
    {
      type: 'math',
      intro: 'The same two failures, written compactly. V is the vocabulary size, e_a is the one-hot vector for word a.',
      latex: [
        'e_a \\in \\mathbb{R}^{V}, \\qquad e_a \\cdot e_b = 0 \\;\\; \\text{for every } a \\neq b',
        '\\lVert e_a - e_b \\rVert = \\sqrt{2} \\qquad \\text{for every } a \\neq b \\;\\; \\text{(all pairs equally distant)}',
      ],
    },
    {
      type: 'intuition',
      title: 'The fix: give each word a short address instead of its own axis',
      md: `Stop giving every word its own slot. Give every word a short list of numbers — say 3 numbers here, 300 in a real system — and let words that mean similar things get similar lists.

- That short list of numbers is the word\'s **embedding**.
- How many numbers each word gets is the **embedding dimension**, usually written d. Here d = 3.
- Stack one row per word and you get the **embedding table** (also called the embedding matrix): V rows, d columns.
- Nobody types those numbers in by hand. They are **learned** — we will see how in a moment. A set of numbers a model figured out for itself, rather than one a human wrote down, is called a **learned representation**.
- Size check: 50,000 words at d = 300 is 15 million numbers total, versus 50,000 numbers for every single token under one-hot.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The embedding table is literally a lookup by row number',
      code: `E = [
    [0.9, 0.1, 0.0],   # row 0 = cat
    [0.8, 0.2, 0.0],   # row 1 = dog
    [0.0, 0.9, 0.1],   # row 2 = helicopter
    [0.2, 0.0, 0.9],   # row 3 = king
    [0.3, 0.0, 0.8],   # row 4 = queen
]                      # 5 rows, one per word in this vocabulary
word_id = {'cat': 0, 'dog': 1, 'helicopter': 2, 'king': 3, 'queen': 4}

print('id of dog    =', word_id['dog'])       # the word's row number
print('row 1 of E   =', E[1])                 # that row, fetched directly
print('lookup(dog)  =', E[word_id['dog']])    # the two steps in one line
print('lookup(king) =', E[word_id['king']])   # any word, same two steps

# ---- real output ----
# id of dog    = 1
# row 1 of E   = [0.8, 0.2, 0.0]
# lookup(dog)  = [0.8, 0.2, 0.0]
# lookup(king) = [0.2, 0.0, 0.9]`,
      annotations: {
        1: 'E is a list of lists: 5 rows (one per word), 3 numbers per row. That is the whole embedding table.',
        2: 'For this hand-made example the three columns roughly mean animal-ness, machine-ness, royalty. In a real trained table NO column has a name — the numbers are whatever training produced, and reading meaning off one column is a beginner mistake.',
        8: 'A dictionary mapping each word to its row number. word_id[word] is the token id, and the token id is the row index.',
        11: 'Looking up an embedding is one array index. No search, no arithmetic — the id IS the row number.',
      },
    },
    {
      type: 'note',
      md: `That is the whole mechanism, and it is worth saying plainly: **an embedding layer is a table you look rows up in.** Old textbooks describe it as multiplying the one-hot vector by the table, which does give the same row — but multiplying 50,000 numbers to fetch one row is silly, so every library just indexes. Same answer, thousands of times less work. The table has V times d numbers in it, and those numbers are trainable weights like any others.`,
    },
    {
      type: 'intuition',
      title: 'Measuring closeness: cosine similarity',
      md: `We now need one number saying how related two embeddings are. The dot product almost works, but it grows when the vectors are simply longer, which has nothing to do with meaning.

- **Cosine similarity** fixes that: take the dot product, then divide by the length of each vector.
- Dividing out both lengths leaves only the angle between the two vectors: +1 pointing the same way, 0 at a right angle, −1 opposite.
- The length of a vector is the square root of its dot product with itself — the Pythagoras rule extended past two numbers.
- This is the same tool the Math module builds from scratch in *Vectors & the Dot Product (= Similarity)*. Read that if the geometry feels shaky; here we just use it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Related words score high, unrelated words score low',
      code: `import math                        # for math.sqrt

cat = [0.9, 0.1, 0.0]             # rows copied out of E above
dog = [0.8, 0.2, 0.0]             # row 1
helicopter = [0.0, 0.9, 0.1]      # row 2

def dot(a, b):                    # same dot product as before
    total = 0.0                   # running sum
    for i in range(len(a)):       # walk the 3 slots
        total += a[i] * b[i]      # multiply slot by slot, accumulate
    return total                  # the overlap score

def cosine(a, b):                 # dot product divided by both lengths
    return dot(a, b) / (math.sqrt(dot(a, a)) * math.sqrt(dot(b, b)))

print('cosine(cat, dog)        =', round(cosine(cat, dog), 3))
print('cosine(cat, helicopter) =', round(cosine(cat, helicopter), 3))

# ---- real output ----
# cosine(cat, dog)        = 0.991
# cosine(cat, helicopter) = 0.11`,
      annotations: {
        3: 'These are exactly the rows from the table above, so nothing new is being invented — we are just scoring pairs of rows.',
        14: 'dot(a, a) is the vector\'s dot product with itself, and its square root is the vector\'s length. Dividing by both lengths is what turns an overlap score into an angle score.',
        16: 'round(x, 3) keeps three decimals so the printed numbers stay readable.',
        17: '0.991 versus 0.11. Under one-hot both of these were 0.0 — that gap is the entire point of embeddings.',
      },
    },
    { type: 'visual', component: 'VectorPlayground', props: {} },
    {
      type: 'note',
      md: `Drag the two arrows above. Pointing the same way gives a big positive score, a right angle gives 0, opposite directions give a negative score. That is cosine similarity with 2 numbers per vector instead of 3 — and a real embedding is the same picture with 300 numbers, which nobody can draw but the arithmetic is identical.`,
    },
    {
      type: 'intuition',
      title: 'Where the numbers come from: ordinary gradient descent',
      md: `Nothing about the table is hand-written. Here is the honest, complete story of how those numbers appear.

- The table starts filled with **small random numbers**. At that point it means nothing at all: cat and helicopter are as likely to be close as cat and dog.
- The table is then treated as weights of the network. Training measures how wrong a prediction was, computes how each number should change to be less wrong, and nudges it. That is gradient descent, exactly as in any other layer.
- Which rows get nudged? Only the rows for the words that appeared in that batch. Untouched words keep their numbers for that step.
- The prediction task involves nearby words, so any two words used in similar company get nudged in similar directions, over and over, across millions of sentences.
- The result: words used in similar contexts drift together, and closeness in the table starts to mean relatedness in the language. Nobody programmed that. It falls out of the updates.`,
    },
    {
      type: 'intuition',
      title: 'word2vec and skip-gram, briefly',
      md: `word2vec (2013) was the method that made this famous, and the prediction task it used is simple enough to state in a sentence.

- Slide a small window along the text. In "the cat sat on the mat" with the window centred on "sat", the nearby words are cat, on, the.
- The **skip-gram** task: given the centre word, predict the words around it. Every window in the corpus is one free training example — the raw text is its own answer key, no human labelling anywhere.
- Getting good at that prediction forces words with similar neighbours to end up with similar rows. That is the entire training signal.
- The famous demo: take the row for king, subtract man, add woman, and the nearest row is often queen. It suggests the "male to female" change is roughly one fixed direction in the space.
- Be honest about it: the effect works for a handful of relation families and fails for most others, the published examples are cherry-picked, and the standard scoring rule deletes king, man and woman from the candidate list first — without that deletion an input word frequently wins. Real, interesting, much weaker than the story.`,
    },
    {
      type: 'note',
      md: `Once you have embeddings, the obvious use is search: embed every document once, embed the query, return the rows with the highest cosine similarity. Doing that over millions of vectors quickly needs approximate nearest-neighbour indexes and vector databases, which are a topic of their own — the GenAI module *Embeddings, Vector Databases & Semantic Search* covers them. This module stops at what an embedding is and how to compare two of them.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: which word is nearest to "king"?',
      md: `Using the table above, with king = [0.2, 0.0, 0.9]. First the length of king: 0.2 squared is 0.04, 0.9 squared is 0.81, sum 0.85, square root **0.922**. Now each candidate, dot product first, then divide by both lengths.

- **queen** [0.3, 0.0, 0.8]: dot = 0.06 + 0 + 0.72 = 0.78. Length = √(0.09 + 0.64) = 0.854. Cosine = 0.78 / (0.922 × 0.854) = **0.990**.
- **cat** [0.9, 0.1, 0.0]: dot = 0.18 + 0 + 0 = 0.18. Length = √(0.81 + 0.01) = 0.906. Cosine = 0.18 / (0.922 × 0.906) = **0.216**.
- **dog** [0.8, 0.2, 0.0]: dot = 0.16. Length = √(0.64 + 0.04) = 0.825. Cosine = 0.16 / (0.922 × 0.825) = **0.211**.
- **helicopter** [0.0, 0.9, 0.1]: dot = 0 + 0 + 0.09 = 0.09. Length = 0.906. Cosine = 0.09 / (0.922 × 0.906) = **0.108**.
- Ranking: queen 0.990, then cat 0.216, dog 0.211, helicopter 0.108. Queen wins by a mile because it is the only other row with a large third number, and in this hand-made table the third column is the royalty one.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: ranking by raw dot product',
      md: `Here is a bug that ships to production regularly. You have embeddings, you want the nearest word to "cat", and you rank by the dot product because it is one line shorter than cosine.

- Suppose helicopter\'s row came out long: [0.0, 9.0, 1.0] instead of [0.0, 0.9, 0.1]. Same direction, ten times the length.
- Vector length in a real table mostly tracks how often a word appeared in training, or how long a document was. It is not meaning.
- Run it and watch the ranking flip.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The wrong answer, then the fix',
      code: `import math                          # for math.sqrt again

cat = [0.9, 0.1, 0.0]                # unchanged
dog = [0.8, 0.2, 0.0]                # unchanged
helicopter_long = [0.0, 9.0, 1.0]    # same direction as before, 10x longer

def dot(a, b):                       # same dot product as before
    total = 0.0                      # running sum
    for i in range(len(a)):          # 3 slots again
        total += a[i] * b[i]         # multiply slot by slot, accumulate
    return total                     # the overlap score

def cosine(a, b):                    # dot divided by both lengths
    return dot(a, b) / (math.sqrt(dot(a, a)) * math.sqrt(dot(b, b)))   # angle only

print('raw dot:  cat.dog =', round(dot(cat, dog), 3), ' cat.heli =', round(dot(cat, helicopter_long), 3))
print('cosine:   cat.dog =', round(cosine(cat, dog), 3), ' cat.heli =', round(cosine(cat, helicopter_long), 3))

# ---- real output ----
# raw dot:  cat.dog = 0.74  cat.heli = 0.9
# cosine:   cat.dog = 0.991  cat.heli = 0.11`,
      annotations: {
        5: 'Every number multiplied by 10. The direction the vector points has not moved at all; only its length changed.',
        16: 'Raw dot says helicopter (0.9) beats dog (0.74). The ranking is wrong, and nothing about meaning changed to cause it — only length did.',
        17: 'Cosine gives 0.991 and 0.11, exactly the values from before the scaling. Dividing by both lengths cancels the factor of 10 completely.',
      },
    },
    {
      type: 'note',
      md: `Diagnosis: the raw dot product mixes two different things — how aligned the vectors are, and how long they are. Scaling one vector by 10 multiplies its dot products by 10 against everything, so the longest vector drifts to the top of every result list regardless of the query. Cosine divides both lengths out, so only alignment is left. The practical habit: normalise every vector to length 1 once when you build the table, and after that a plain dot product **is** the cosine, at plain-dot-product cost.

The sibling mistake, same family: reading meaning out of a table that has not been trained. A freshly initialised table is random numbers, so its similarities are random too. Any "cat is close to helicopter" you find there is noise, not a finding.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work them out on paper first; the solutions follow in the next block.

1. Vocabulary is [red, green, blue, sky]. Write the one-hot vector for "blue", and give the dot product of one-hot("blue") with one-hot("sky").
2. Table rows a = [3, 4] and b = [6, 8]. Compute the raw dot product and the cosine similarity. What does the difference between the two tell you?
3. A vocabulary of 30,000 words with d = 200. How many numbers are in the embedding table, and how many numbers represent a single token — under embeddings, and under one-hot?
4. u = [1, 0] and v = [0, 1]. Compute the cosine. Then compute the cosine of u with w = [1, 1] (√2 ≈ 1.414). Rank v and w by closeness to u.`,
    },
    {
      type: 'note',
      md: `**1.** blue is at position 2, so one-hot("blue") = [0, 0, 1, 0] and one-hot("sky") = [0, 0, 0, 1]. Their dot product is 0 — as it is for every pair of different words, which is exactly the defect.

**2.** dot = 3×6 + 4×8 = 18 + 32 = 50. Lengths: √(9+16) = 5 and √(36+64) = 10. Cosine = 50 / (5 × 10) = 1.0. b is a is doubled, so the two point in identical directions; cosine says "identical" while the raw dot says 50, a number that only looks large because b is long.

**3.** The table holds 30,000 × 200 = 6,000,000 numbers. One token is 200 numbers under embeddings, and 30,000 numbers (29,999 of them zero) under one-hot.

**4.** u·v = 0, both lengths 1, cosine = 0 — a right angle, unrelated. u·w = 1×1 + 0×1 = 1, lengths 1 and 1.414, cosine = 1 / 1.414 = 0.707. So w (0.707) is much closer to u than v (0.0) is.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Four things you do not need in order to understand embeddings, but will meet later.

- **Negative sampling.** Predicting the correct word out of 50,000 needs a score for all 50,000 every step, which is unaffordable. word2vec instead asks a yes/no question — "is this pair of words a real neighbour pair?" — training on 1 real pair against about 5 to 20 randomly drawn fake ones. Cost per step drops from 50,000 to about 20 for very similar vectors.
- **Static versus contextual.** word2vec gives one row per word, forever. So "bank" gets a single row that blurs the river sense and the money sense together, and no later layer can unmix them. Contextual models (BERT and today\'s LLMs) compute a fresh vector for each occurrence from the surrounding words, so the two "bank"s land in different places.
- **Bias is inherited, not invented.** The table learns whatever the corpus contains, stereotypes included — nurse landing near female words, programmer near male ones. It matters because these vectors feed résumé screeners and search ranking. Mitigations exist and are imperfect: the bias often stays recoverable from the geometry even after it stops showing on the obvious tests.
- **Choosing d.** Classic word vectors use 50 to 300; modern sentence embeddings use 384 to 1536. Too small and distinct meanings collide; too large and you pay memory and search time, and on a small corpus the spare capacity fits noise. Pick it by measuring on your actual task.`,
    },
  ],
  quiz: [
    {
      question: 'What is the fundamental problem with one-hot encoding for words?',
      options: [
        {
          text: 'It is too slow to compute',
          explanation: 'Building a one-hot is trivially fast. The size is a nuisance; the lack of meaning is the real defect.',
        },
        {
          text: 'Every pair of distinct words is equally distant, so the encoding carries no information about meaning',
          explanation: 'Correct. Any two different one-hots have dot product 0, so cat/dog and cat/helicopter score identically.',
        },
        {
          text: 'It cannot represent words outside the vocabulary',
          explanation: 'True, but embeddings share that problem. It is not what embeddings were invented to fix.',
        },
      ],
      correct: 1,
    },
    {
      question: 'An embedding table has 40,000 rows and 128 columns. What does looking up the token with id 12 do?',
      options: [
        {
          text: 'Returns row 12 of the table: a list of 128 numbers',
          explanation: 'Correct. The token id is the row number, and each row is d = 128 numbers long.',
        },
        {
          text: 'Returns column 12: a list of 40,000 numbers',
          explanation: 'Columns are dimensions shared by every word, not words. One word is one row.',
        },
        {
          text: 'Runs a search through the table for the matching word',
          explanation: 'No search happens. The id is already the row index, so it is a single array index.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Where do the numbers in an embedding table come from?',
      options: [
        {
          text: 'A linguist assigns each dimension a meaning and fills in the values',
          explanation: 'No one hand-writes them, and in a trained table no dimension has a nameable meaning.',
        },
        {
          text: 'They start random and are updated by gradient descent, like any other weights',
          explanation: 'Correct. Training nudges the rows of the words it sees, so words used in similar contexts drift together.',
        },
        {
          text: 'They are computed once from word frequencies with a fixed formula',
          explanation: 'Frequency alone would not put cat near dog. The numbers come from training on a prediction task.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Why divide by both vector lengths instead of using the raw dot product?',
      options: [
        {
          text: 'Because raw dot products cannot be negative',
          explanation: 'Backwards — dot products can certainly be negative, and so can cosine, down to -1.',
        },
        {
          text: 'Because vector length mostly tracks frequency or document length, not meaning, so long vectors would win every ranking',
          explanation: 'Correct. Scaling helicopter by 10 made it beat dog on raw dot while its cosine never moved.',
        },
        {
          text: 'Because it is cheaper',
          explanation: 'It is more expensive — a dot product plus two lengths. Unless you pre-normalise, after which cosine is a plain dot product.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You initialise an embedding table with random numbers and immediately check which words are close to "cat". What have you measured?',
      options: [
        {
          text: 'The model\'s prior knowledge of language',
          explanation: 'There is no prior knowledge. Nothing has been trained on any text yet.',
        },
        {
          text: 'Nothing — the similarities are random noise until the table is trained',
          explanation: 'Correct. Meaning appears only after gradient descent has moved the rows. Reading an untrained table is a classic beginner mistake.',
        },
        {
          text: 'A weak but usable similarity signal',
          explanation: 'Random numbers give random neighbours. There is no weak signal to salvage.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A colleague demos king - man + woman landing near queen and says the model understands gender. Best response?',
      options: [
        {
          text: 'Agree — the model has learned the concept of gender',
          explanation: 'Overclaim. What exists is a geometric regularity from co-occurrence counts, not understanding.',
        },
        {
          text: 'It shows one relation became roughly a fixed direction in the space, but the effect is cherry-picked and the scoring rule excludes the three input words',
          explanation: 'Correct. The real finding is linear relational structure for a few relation families, and it is weaker than the folklore.',
        },
        {
          text: 'Dismiss it — the result is fake',
          explanation: 'It is a real, reproducible effect. The problem is the size of the claim, not the existence of the result.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why do we use embeddings instead of one-hot vectors?',
      answer:
        'One-hot gives every word its own slot, so any two different words have dot product 0 and sit the same distance apart: cat is as far from dog as from helicopter. The representation stores identity and nothing else, in 50,000 dimensions that are almost entirely zero. An embedding replaces that with a short dense list of learned numbers, maybe 300, where closeness means relatedness. Two practical wins follow. The input layer shrinks by orders of magnitude. And similar words share statistical strength, so a model that has seen "dog" many times generalises to "puppy" that it barely saw, because their rows sit near each other.',
      isCaseBased: false,
    },
    {
      question: 'Is an embedding layer a lookup or a matrix multiplication?',
      answer:
        'Both, and the lookup is the optimisation. Formally the input is a one-hot vector and the layer computes one-hot times E, which by construction selects row i of E. Done literally that is V multiply-adds to fetch d numbers, so every framework indexes the row directly instead. Three consequences worth naming: the table is trainable like any weight matrix; its gradient is sparse, since only rows appearing in the batch get updated, which is why sparse optimisers exist for embedding tables; and the parameter count is V times d, which at 50,000 by 768 is about 38 million, often the largest single tensor in a small model.',
      isCaseBased: false,
    },
    {
      question: 'How does an embedding table actually learn anything?',
      answer:
        'It starts as small random numbers, which mean nothing. It is then treated as ordinary weights inside a prediction task, typically predicting nearby words from a word, or the masked word from its sentence. Each batch computes how wrong the prediction was and nudges the numbers to reduce that error, updating only the rows for tokens that appeared. Because the task is defined by context, two words that keep showing up in the same company keep receiving similar nudges, and over millions of sentences they drift into the same region of the space. Nothing about meaning is programmed in; the structure is a by-product of getting good at the prediction task.',
      isCaseBased: false,
    },
    {
      question: 'Explain skip-gram in plain terms, including where the labels come from.',
      answer:
        'Slide a window of a few words along the corpus. Take the centre word and train the model to predict each of the surrounding words. In "the cat sat on the mat" centred on "sat", the targets are cat, on and the. The labels are free: the text supplies both the input and the answer, so it is self-supervised and needs no annotation. Getting good at that prediction forces words with similar neighbours towards similar vectors, which is the entire mechanism. The naive version needs a score over the full vocabulary per step, so real implementations use negative sampling: score one real pair against a handful of random fake pairs and train a yes/no classifier instead.',
      isCaseBased: false,
    },
    {
      question: 'Case: your semantic search returns garbage. Long documents dominate the results regardless of query, and identical texts rank far apart. Debug it.',
      answer:
        'Two symptoms, two different bugs, so separate them. Long documents winning every query is the signature of ranking by raw dot product on unnormalised vectors: magnitude grows with length and token count, so the longest chunk wins on norm rather than relevance, exactly like the scaled-up helicopter vector beating dog. Fix by normalising every vector to unit length and ranking by cosine, which is then just a dot product. Identical texts ranking far apart is an encoding inconsistency instead: query and documents embedded by different models or model versions, an asymmetric query-encoder and passage-encoder used symmetrically, a missing instruction prefix some models require, or a stale index built before a model upgrade. Test it directly by embedding the same string through both paths and confirming cosine near 1.0. After that, check chunking, since a chunk spanning unrelated topics averages into a vector that means nothing. Order of work: verify encoder identity end to end, then normalisation, then chunk boundaries.',
      isCaseBased: true,
    },
    {
      question: 'Case: you ship a resume-ranking feature on pretrained embeddings. Legal asks whether it can discriminate. What do you say, and what is your plan?',
      answer:
        'Say yes, it can, and probably does by default. Embeddings absorb the statistics of their corpus, including occupational gender and ethnicity associations, and the ranking model never sees a protected attribute yet still uses it, because the attribute is recoverable from the geometry of ordinary words and names. Plan in four parts. Measure first: association tests on the embedding space, plus a direct audit that swaps names and gendered terms on otherwise identical resumes and reports the rank change. Mitigate at several levels: drop or neutralise name and pronoun features, apply a debiasing projection along an estimated bias direction, fine-tune on in-domain balanced data. State the ceiling honestly: hard-debiasing is known to hide bias from the obvious tests while leaving clusters recoverable, so it is reduction, not removal. Add process controls: human review, ongoing outcome monitoring by group, a documented model card. Name the trade-off out loud, that aggressive debiasing costs some ranking quality and that is the right trade here.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate hand-labels the columns of a trained 300-dimension embedding table, claiming dimension 42 is "sentiment". How do you respond?',
      answer:
        'Ask what evidence supports it, then explain why the claim is almost certainly wrong. Training never assigns meaning to individual axes; the objective only constrains relative positions of the rows, so any rotation of the whole space gives an equally good solution with completely different column values. Meaning is carried by directions in the space, and there is no reason for a meaningful direction to line up with a coordinate axis. If dimension 42 really does correlate with sentiment, the way to show it is a proper probe: fit a simple classifier on the full vectors, compare it against the single-dimension version, and check on held-out words. Usually you find a sentiment direction that is a combination of many dimensions, not one column. The practical risk of the original claim is a feature-engineering pipeline built on one column that silently breaks the next time the table is retrained, since the axes will land differently.',
      isCaseBased: true,
    },
    {
      question: 'How do you choose the embedding dimension d, and what goes wrong at each extreme?',
      answer:
        'Empirically, by validating on the downstream task. Useful priors: 50 to 300 for classic word vectors, 384 to 1536 for modern sentence embeddings. Too small and there is not enough room to keep distinct meanings apart, so concepts collide and downstream accuracy plateaus low, the underfitting signature. Too large and memory and index size grow linearly in d, similarity search slows, and on a small corpus the spare capacity fits co-occurrence accidents rather than real structure. Two points that land well: the gain per extra dimension flattens quickly, so the curve is cheap to explore; and for retrieval, d interacts with your index and quantisation budget, which makes the choice partly an infrastructure decision rather than a purely modelling one.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What is wrong with one-hot encoding?', back: 'Every pair of distinct words has dot product 0 and equal distance, so cat is as far from dog as from helicopter. It stores identity and no meaning, in V mostly-zero numbers.' },
    { front: 'Definition of an embedding', back: 'A short, dense list of learned numbers standing for one token, where closeness in the space means relatedness in meaning. How many numbers is the embedding dimension d.' },
    { front: 'What is the embedding table?', back: 'A V-by-d matrix, one row per vocabulary word. The token id is the row number, so a lookup is a single array index, not a search.' },
    { front: 'Lookup or matrix multiply?', back: 'Both. One-hot times E selects row i, but doing it literally wastes V multiplications, so libraries index directly. Same math, trainable either way, gradients touch only the used rows.' },
    { front: 'How do embeddings get learned?', back: 'They start random and are updated by gradient descent like any other weights, on a task that predicts nearby words. Words in similar contexts get similar nudges and drift together.' },
    { front: 'Cosine similarity', back: 'Dot product divided by both vector lengths. Leaves the angle only: +1 same direction, 0 right angle, -1 opposite. Length tracks frequency, not meaning, so divide it out.' },
    { front: 'Skip-gram in one line', back: 'Given the centre word of a window, predict each surrounding word. Labels come free from the raw text, so no annotation is needed.' },
    { front: 'king - man + woman, honestly', back: 'One relation became roughly a fixed direction in the space. But it is cherry-picked, fails for most relations, and the standard scoring deletes the three input words before ranking.' },
  ],
  mindmapMarkdown: `- Embeddings: Meaning as Vectors
  - The problem
    - a network eats numbers; a word is not a number
    - vocabulary = allowed word list; token = one item
  - Attempt 1: one-hot
    - one 1, rest zeros: cat = [1,0,0,0]
    - failure 1: 50,000 numbers per token
    - failure 2: every distinct pair scores 0
    - cat-dog = cat-helicopter
  - The embedding
    - short dense list of learned numbers (d = 300)
    - embedding table: V rows x d columns
    - token id = row number, lookup = one index
    - starts random, learned by gradient descent
  - Comparing two of them
    - dot product mixes alignment and length
    - cosine = dot / (length x length) -> angle only
    - cat-dog 0.991 vs cat-helicopter 0.11
    - normalise once, then dot == cosine
  - word2vec / skip-gram
    - centre word predicts its neighbours
    - labels free from raw text
    - king - man + woman: real but cherry-picked
  - Classic mistake
    - ranking by raw dot: longest vector wins everything
    - reading an untrained random table
  - Beyond the basics
    - negative sampling: 1 real pair vs ~20 fakes
    - static vs contextual: "bank" gets one blurred row
    - bias inherited from the corpus
    - choosing d: 50-300 classic, 384-1536 modern
  - Next
    - GenAI: Embeddings, Vector Databases & Semantic Search`,
}

export default m
