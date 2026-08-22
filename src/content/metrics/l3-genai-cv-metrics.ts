import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-genai-cv-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Text Generation Metrics: Perplexity, BLEU & ROUGE',
  whyItMatters:
    'Every metric you have met so far counts things: this prediction was right, that one was wrong, put each one in a box and add up the boxes. Text generation has no boxes. A model writes a sentence, a human wrote a different sentence, and both can be correct. This module builds the three numbers people actually report — perplexity, BLEU and ROUGE — from four probabilities and two six-word sentences you can check on paper, and shows exactly what each one is blind to.',
  assumes: [
    'You have read *Loss vs Metric*, so you know a loss is the number the model descends and a metric is the number a person reads',
    'You have read *Classification Losses*, so you have met cross-entropy: the average surprise of the model, measured as minus the log of the probability it gave to the correct answer',
    'You know what precision and recall are from *The Confusion Matrix*',
    'You have seen a Python list, a for loop, and a function',
    'You know from school maths that a logarithm is the inverse of a power: log2(8) = 3 because 2 to the power 3 is 8',
  ],
  estMinutes: 44,
  sections: [
    {
      type: 'intuition',
      title: 'Two answers, both correct, and no box to put them in',
      md: `A model is asked to rewrite one sentence. A human wrote the reference answer.

- Reference, written by the human: **"the meeting was postponed to friday"**.
- The model writes: **"they pushed it back until friday"**.
- Read both. They mean the same thing. Any person would mark this correct.
- Now count the words they share. Only one word — *friday* — appears in both. Five of six words are different.
- A second model writes: **"the meeting was not postponed to friday"**. That means the opposite. It is wrong.
- But it shares six words out of seven with the reference.

So word-counting rates the wrong answer far above the right one. Hold that in mind: it is not a bug we are going to fix in this module, it is the permanent limitation of every score here. By the end you will be able to put a number on it — the correct paraphrase scores **0.0000** and the flipped-meaning sentence scores **0.7559** on the same metric.`,
    },
    {
      type: 'visual',
      component: 'Plot',
      props: {
          title: 'Perplexity is just cross-entropy, exponentiated',
          notice: 'Perplexity = e^(cross-entropy), so it answers "how many options is the model effectively choosing between?". Cross-entropy 0 means perplexity 1 — it knows the answer. Cross-entropy 2.303 means perplexity 10, i.e. as confused as guessing uniformly among 10 words. Because the curve is exponential, a cut of 0.7 in loss roughly halves perplexity wherever you are on it — which is why loss improvements that look tiny are reported as large perplexity wins.',
          kind: 'line',
          xLabel: 'cross-entropy (nats)',
          yLabel: 'perplexity',
          series: [
            {
              name: 'perplexity',
              points: [[0, 1], [0.1, 1.1052], [0.2, 1.2214], [0.3, 1.3499], [0.4, 1.4918], [0.5, 1.6487], [0.6, 1.8221], [0.7, 2.0138], [0.8, 2.2255], [0.9, 2.4596], [1, 2.7183], [1.1, 3.0042], [1.2, 3.3201], [1.3, 3.6693], [1.4, 4.0552], [1.5, 4.4817], [1.6, 4.953], [1.7, 5.4739], [1.8, 6.0496], [1.9, 6.6859], [2, 7.3891], [2.1, 8.1662], [2.2, 9.025], [2.3, 9.9742], [2.4, 11.0232], [2.5, 12.1825], [2.6, 13.4637], [2.7, 14.8797], [2.8, 16.4446], [2.9, 18.1741], [3, 20.0855], [3.1, 22.198], [3.2, 24.5325], [3.3, 27.1126], [3.4, 29.9641], [3.5, 33.1155], [3.6, 36.5982], [3.7, 40.4473], [3.8, 44.7012], [3.9, 49.4024], [4, 54.5982], [4.1, 60.3403], [4.2, 66.6863], [4.3, 73.6998], [4.4, 81.4509], [4.5, 90.0171], [4.6, 99.4843], [4.7, 109.9472], [4.8, 121.5104], [4.9, 134.2898], [5, 148.4132]],
            },
          ],
          markers: [
            { x: 2.3026, y: 10, text: 'CE 2.303 → 10' },
            { x: 0, y: 1, text: 'CE 0 → 1' },
          ],
        },
    },
    {
      type: 'intuition',
      title: 'The two things you can measure instead',
      md: `Since you cannot check meaning by counting, the field split into two moves. Both are in this module.

- **Move one: score the model’s own probabilities.** Before the model writes a word it assigns a probability to every word it might write. Take a piece of real human text and ask: what probability did the model give to the words that actually appeared? That needs no reference answer and no judgement about meaning. **Perplexity** is this move.
- **Move two: score the output text against a reference.** Write down one correct answer, then measure how much of it the model’s answer reuses. **BLEU** and **ROUGE** are this move.
- Move one measures whether the model has learned the language. Move two measures whether it produced this particular answer.
- Neither one measures whether the answer is true, useful, or safe. Nothing in this module does.`,
    },
    {
      type: 'intuition',
      title: 'From cross-entropy to perplexity: four probabilities, by hand',
      md: `You already know cross-entropy: the model’s average surprise, where surprise on one item is minus the log of the probability the model gave to the correct answer. Perplexity is that same number, rescaled once. Here is the whole thing on four words.

- The sentence is **"the cat sat down"**. The model reads it left to right and, at each position, reports the probability it had given to the word that actually came next.
- p(the) = **0.5**. p(cat, given "the") = **0.25**. p(sat, given "the cat") = **0.125**. p(down, given "the cat sat") = **0.25**.
- Take log base 2 of each: log2(0.5) = −1, log2(0.25) = −2, log2(0.125) = −3, log2(0.25) = −2. (log2(0.5) = −1 because 2 to the power −1 is 0.5.)
- Flip the signs and average: (1 + 2 + 3 + 2) / 4 = **2 bits of surprise per word**. That average is the cross-entropy.
- **Perplexity** is 2 raised to that average: 2² = **4**.

Why raise 2 to the power of it? Because it converts "bits of surprise" back into "number of choices". A model choosing uniformly between 4 equally likely words has probability 0.25 every time, surprise 2 bits every time, and perplexity exactly 4. So our model is, on average across this sentence, **as unsure as someone picking blindly among 4 options at every word**. That is the whole reason perplexity exists: 2 bits means nothing to most people, "as confused as a 4-way blind guess" means something.`,
    },
    {
      type: 'note',
      md: `Where KL divergence fits, in plain words, because you will hear the name. Cross-entropy splits into two parts. Part one is the surprise nobody can avoid: real text is genuinely unpredictable, and even a perfect model would be surprised sometimes. Part two is the extra surprise you pay for having the wrong probabilities. That second part is called the **KL divergence** between the true word probabilities and the model’s. It is never negative, and it is zero only when the two sets of probabilities are identical. Check it on a two-word toy language where the truth is 90%/10% and the model says 50%/50%: the unavoidable part is 0.4690 bits, the model’s cross-entropy is 1.0000 bits, and the difference — the KL divergence — is 0.5310 bits. Training cannot touch the first part, so lowering cross-entropy means lowering KL, and perplexity is that same quantity written as a number of choices. That is all you need here.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Perplexity by hand: the four probabilities, step by step',
      code: `import math

probs = [0.5, 0.25, 0.125, 0.25]
total = 0.0
for p in probs:
    total = total + math.log2(p)
avg = total / len(probs)
print(round(-avg, 4))
print(round(2 ** (-avg), 4))

# ---- real output ----
# 2.0
# 4.0`,
      annotations: {
        1: 'math is a standard Python module. We need log2 (logarithm base 2) and nothing else, so there is no numpy anywhere in this module.',
        3: 'The four probabilities the model gave to the four words that actually appeared, in order. These are the only inputs perplexity ever needs.',
        4: 'A running total, started at 0.0 rather than 0 to make clear it accumulates decimals.',
        5: 'Walk the list one probability at a time. p is the current probability.',
        6: 'math.log2(p) is the log base 2 of p, which is negative for any probability below 1. Adding logs is how you combine surprises: -1, then -2, then -3, then -2.',
        7: 'Divide by 4 to get the average. len(probs) is the number of words, so this works for a sentence of any length.',
        8: 'The minus sign flips the average from -2.0 to +2.0, so it reads as "2 bits of surprise per word" rather than a negative number. This is the cross-entropy.',
        9: '2 raised to the average surprise. 2 ** 2.0 is 4.0 — the perplexity. Perplexity is always at least 1.0, which would mean the model gave probability 1 to every word it saw.',
      },
    },
    {
      type: 'intuition',
      title: 'Another way to read perplexity, and the trait that bites you',
      md: `There is a second reading of the same number that makes its worst habit obvious.

- Multiply the four probabilities: 0.5 × 0.25 × 0.125 × 0.25 = **0.00390625**. Take the fourth root of that: **0.25**. That is called the **geometric average** of the four probabilities — multiply them all together, then take the n-th root when there are n of them. It is the natural average for numbers that get multiplied rather than added, which is exactly what probabilities do.
- Perplexity is 1 divided by that geometric average: 1 / 0.25 = **4**. Same answer as before, by a different route.
- Now the consequence. In a multiplication, one very small factor drags everything down and no amount of large factors rescues it. Change the third probability from 0.125 to **0.001** — one word the model found shocking — and leave the other three alone.
- Perplexity jumps from 4.00 to **13.37**, more than tripling, because of a single word out of four.

So perplexity is dominated by the model’s worst moments, not its typical ones. A model that is usually confident and occasionally stunned scores worse than one that is mildly unsure all the time.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The same calculation as a function, run on three sentences',
      code: `def perplexity(probs):
    total = 0.0
    for p in probs:
        total = total + math.log2(p)
    return 2 ** (-total / len(probs))

print(round(perplexity([0.5, 0.25, 0.125, 0.25]), 4))
print(round(perplexity([0.5, 0.25, 0.001, 0.25]), 4))
print(round(perplexity([0.25, 0.25, 0.25, 0.25]), 4))

# ---- real output ----
# 4.0
# 13.3748
# 4.0`,
      annotations: {
        1: 'The same lines from the previous snippet, wrapped in a function so we can call it on different sentences.',
        2: 'The running total, reset to zero on every call.',
        3: 'Loop over however many probabilities were passed in.',
        4: 'Add the log of each probability, exactly as before.',
        5: 'Average, flip the sign, and raise 2 to it — the whole formula on one line now that you have seen it built.',
        7: 'The original four probabilities. Prints 4.0, matching the hand calculation.',
        8: 'Only the third probability changed, 0.125 to 0.001. Perplexity more than triples to 13.3748 on the strength of one word.',
        9: 'A model that says 0.25 for every word. Perplexity 4.0 as well — the same score as our first model, which was confident on some words and lost on others.',
      },
    },
    {
      type: 'note',
      md: `One practical warning before we leave perplexity. It is measured **per word-piece**, and different models chop text into word-pieces differently — one may treat "postponed" as a single piece, another as "post" plus "poned". A model that uses fewer, longer pieces is making fewer, harder predictions for the same text, and its per-piece surprise is a different quantity. So perplexity is a fair way to compare two versions of your own model on your own held-out text, and it is not a fair way to compare your model against a number printed in someone else’s paper. Different chopping, different corpus, different number.`,
    },
    {
      type: 'intuition',
      title: 'What an n-gram is',
      md: `BLEU and ROUGE are both built out of one object, so define it before anything else uses it.

- An **n-gram** is a run of n words in a row, taken from a sentence. That is the entire definition. "Gram" here just means "piece".
- Take the sentence **"the cat sat on the mat"** — six words.
- Its **1-grams** (also called unigrams) are the single words, in order: *the*, *cat*, *sat*, *on*, *the*, *mat*. There are six. Note that *the* appears twice, and it counts twice.
- Its **2-grams** (bigrams) are every adjacent pair: *the cat*, *cat sat*, *sat on*, *on the*, *the mat*. There are five.
- Its **3-grams** are every run of three: *the cat sat*, *cat sat on*, *sat on the*, *on the mat*. There are four.
- The pattern: a sentence of L words has **L − n + 1** n-grams. Six words gives 6 − 1 + 1 = 6 unigrams, 6 − 2 + 1 = 5 bigrams, 6 − 3 + 1 = 4 trigrams.

Why bother with pairs and triples at all? Because single words say nothing about order. "dog bites man" and "man bites dog" have identical 1-grams. Their 2-grams are completely different. Longer n-grams are how a word-counting metric gets a rough grip on word order.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'n-grams in five lines',
      code: `def ngrams(words, n):
    out = []
    for i in range(len(words) - n + 1):
        out.append(tuple(words[i:i + n]))
    return out

cand = 'the cat sat on the mat'.split()
ref = 'the cat is on the mat'.split()
print(ngrams(cand, 2))

# ---- real output ----
# [('the', 'cat'), ('cat', 'sat'), ('sat', 'on'), ('on', 'the'), ('the', 'mat')]`,
      annotations: {
        1: 'Takes a list of words and a number n, and returns every run of n words.',
        2: 'An empty list to collect them in.',
        3: 'range(len(words) - n + 1) is the L - n + 1 count from the section above, turned into starting positions 0, 1, 2, and so on. The loop stops before a run would fall off the end.',
        4: 'words[i:i + n] is a slice: the n words starting at position i. tuple(...) freezes that slice into an unchangeable pair or triple, which matters because we will later count how often each one occurs and only unchangeable things can be counted that way. append adds it to the list.',
        5: 'Hand back the finished list.',
        7: '.split() cuts a string into a list of words at the spaces. cand is the candidate — the sentence a model produced.',
        8: 'ref is the reference — the sentence a human wrote. It differs from cand in exactly one word: "is" where the candidate has "sat".',
        9: 'Print the candidate’s 2-grams. Five of them, exactly the five listed by hand above.',
      },
    },
    {
      type: 'intuition',
      title: 'BLEU: how much of what you wrote appears in the human answer',
      md: `BLEU was built for machine translation, where a good translation reuses most of the words a human would have used. It asks a precision question: **of the n-grams you produced, what fraction appear in the reference?**

Work it on our pair. Candidate: **"the cat sat on the mat"**. Reference: **"the cat is on the mat"**.

- **1-grams.** The candidate’s six are *the, cat, sat, on, the, mat*. Checking each against the reference: *the* is there, *cat* is there, *sat* is not, *on* is there, *the* again is there, *mat* is there. Five of six match, so the 1-gram precision is **5/6 = 0.8333**.
- **2-grams.** The candidate’s five are *the cat, cat sat, sat on, on the, the mat*. The reference’s five are *the cat, cat is, is on, on the, the mat*. Matching: *the cat* yes, *cat sat* no, *sat on* no, *on the* yes, *the mat* yes. Three of five, so **3/5 = 0.6000**.
- Notice how the single wrong word damages the 2-gram score twice as hard as the 1-gram score, because it sits inside two different pairs. That is n-grams doing their job.`,
    },
    {
      type: 'intuition',
      title: 'The two repairs BLEU needs: clipping and a length penalty',
      md: `That precision idea, taken raw, can be cheated in two obvious ways. BLEU patches both.

- **Cheat one: repeat a good word.** Output **"the the the the the the"**. Every one of the six 1-grams is a word that appears in the reference, so raw precision is 6/6 = 1.0000 for a sentence that says nothing.
- **The repair, called clipping.** A candidate n-gram can only be credited as many times as it appears in the reference. The reference contains *the* twice, so out of the candidate’s six copies only two get credit. Precision becomes **2/6 = 0.3333**.
- **Cheat two: say almost nothing.** Output just **"the mat"**. Both 1-grams are in the reference, so 1-gram precision is 2/2 = 1.0000, and its single 2-gram *the mat* is in the reference too, so 2-gram precision is 1/1 = 1.0000. Perfect scores for a two-word non-answer.
- **The repair, called the brevity penalty.** If the candidate is shorter than the reference, multiply the whole score by e^(1 − r/c), where r is the reference length and c the candidate length. Here r = 6 and c = 2, so the multiplier is e^(1 − 3) = e^(−2) = **0.1353**. If the candidate is as long as the reference or longer, the multiplier is 1 and nothing happens.
- Why that formula? Because it equals exactly 1 when c = r and falls smoothly the shorter you get, with no cutoff to game. Being long is not penalised at all — precision already punishes padding, since every extra unmatched word enlarges the denominator.

Last piece: BLEU combines the 1-gram and 2-gram precisions (and usually 3-gram and 4-gram too) by taking their **geometric average** — multiply them and take the n-th root, the same averaging you met with perplexity. With 0.8333 and 0.6000: 0.8333 × 0.6000 = 0.5000, and the square root of 0.5000 is **0.7071**. The reason to multiply rather than to add and halve: if any one of the precisions is zero, the whole product is zero. A candidate that gets every single word right but no adjacent pair right scores 0, not 0.5.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Clipped precision, with both cheats tested',
      code: `def clipped_precision(cand, ref, n):
    cand_grams = ngrams(cand, n)
    ref_grams = ngrams(ref, n)
    matched = 0
    for g in set(cand_grams):
        matched = matched + min(cand_grams.count(g), ref_grams.count(g))
    return matched / len(cand_grams)

print(round(clipped_precision(cand, ref, 1), 4))
print(round(clipped_precision(cand, ref, 2), 4))
spam = 'the the the the the the'.split()
print(round(clipped_precision(spam, ref, 1), 4))

# ---- real output ----
# 0.8333
# 0.6
# 0.3333`,
      annotations: {
        1: 'Takes the candidate words, the reference words, and which n to use.',
        2: 'All of the candidate’s n-grams, using the function from before.',
        3: 'All of the reference’s n-grams.',
        4: 'A counter for how many pieces of the candidate got credit.',
        5: 'set(cand_grams) removes duplicates, so each distinct n-gram is considered once. Without it we would handle "the" twice and clip twice, crediting 4 instead of 2.',
        6: '.count(g) asks how many times g appears in a list. min(...) of the two counts is the clipping rule in one call: credit is the smaller of "how often you said it" and "how often the human said it".',
        7: 'Divide by the total number of candidate n-grams. The denominator is the CANDIDATE — that is what makes this precision rather than recall.',
        9: '1-gram precision on our sentence pair: 5 of 6 words credited, 0.8333.',
        10: '2-gram precision: 3 of 5 pairs credited, 0.6. Python prints 0.6, not 0.6000.',
        11: 'The cheat sentence: the word "the", six times over.',
        12: 'Clipping caps it at the 2 copies the reference has, so 2/6 = 0.3333 instead of a perfect 1.0.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'BLEU on two n-gram sizes, brevity penalty included',
      code: `def bleu2(cand, ref):
    p1 = clipped_precision(cand, ref, 1)
    p2 = clipped_precision(cand, ref, 2)
    geo = (p1 * p2) ** 0.5
    bp = 1.0
    if len(cand) <= len(ref):
        bp = math.exp(1 - len(ref) / len(cand))
    return bp * geo

print(round(bleu2(cand, ref), 4))
print(round(bleu2('the mat'.split(), ref), 4))

# ---- real output ----
# 0.7071
# 0.1353`,
      annotations: {
        1: 'The whole of BLEU for n = 1 and 2. Real BLEU goes up to n = 4; the shape is identical, just with two more precisions in the product.',
        2: 'The 1-gram clipped precision, 0.8333 on our pair.',
        3: 'The 2-gram clipped precision, 0.6.',
        4: 'Multiply them and raise to the power 0.5, which is the square root — the geometric average of two numbers. 0.8333 * 0.6 = 0.5, and the square root of 0.5 is 0.7071.',
        5: 'The brevity penalty, starting at 1.0 meaning "no penalty". This is the value it keeps when the candidate is long enough.',
        6: 'Only a candidate shorter than or equal to the reference gets penalised. Longer candidates are already punished through the precision denominator.',
        7: 'math.exp(x) is e raised to x. With r = 6 and c = 2 this is e ** (1 - 3) = 0.1353.',
        8: 'Multiply the penalty into the averaged precision. That product is BLEU.',
        10: 'Our sentence pair: 0.7071, matching the hand calculation.',
        11: 'The two-word non-answer: perfect precisions, crushed to 0.1353 by the brevity penalty.',
      },
    },
    {
      type: 'intuition',
      title: 'ROUGE: how much of the human answer survives in what you wrote',
      md: `Summarisation asks the opposite question from translation. A translation must not **add** things, so BLEU checks the candidate’s words against the reference. A summary must not **drop** things, so ROUGE checks the reference’s words against the candidate. One swap: the denominator becomes the reference. That turns precision into recall.

Work it. Reference summary written by a human: **"the board approved the merger on friday"** — seven words. Candidate summary from the model: **"the board approved the merger"** — five words.

- **ROUGE-1.** The reference has seven 1-grams: *the* twice, plus *board, approved, merger, on, friday*. Which survive in the candidate? *the* twice, *board, approved, merger* — five of them. *on* and *friday* are gone. ROUGE-1 = **5/7 = 0.7143**.
- **ROUGE-2.** The reference’s six 2-grams are *the board, board approved, approved the, the merger, merger on, on friday*. The candidate contains the first four and not the last two. ROUGE-2 = **4/6 = 0.6667**.
- Now compute BLEU-style precision on the same pair for contrast: every one of the candidate’s five 1-grams is in the reference, so precision is **5/5 = 1.0000**. Precision says the summary is flawless. Recall says it lost the date.
- That gap is the whole point. The candidate dropped *on friday* — a fact a reader would want. Only the recall-flavoured number can see a missing thing, because a missing thing leaves no trace in the candidate for precision to inspect.
- **ROUGE-2 is the variant that agrees with human judgement most often** of the common ones, because pairs catch the difference between keeping the words and keeping the statement.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'ROUGE: the same code with one line changed',
      code: `def rouge_n(cand, ref, n):
    cand_grams = ngrams(cand, n)
    ref_grams = ngrams(ref, n)
    matched = 0
    for g in set(ref_grams):
        matched = matched + min(cand_grams.count(g), ref_grams.count(g))
    return matched / len(ref_grams)

summary = 'the board approved the merger'.split()
gold = 'the board approved the merger on friday'.split()
print(round(rouge_n(summary, gold, 1), 4))
print(round(rouge_n(summary, gold, 2), 4))
print(round(clipped_precision(summary, gold, 1), 4))

# ---- real output ----
# 0.7143
# 0.6667
# 1.0`,
      annotations: {
        1: 'Same three arguments as clipped_precision. Compare the two functions line by line: only lines 5 and 7 differ.',
        2: 'The candidate’s n-grams, unchanged.',
        3: 'The reference’s n-grams, unchanged.',
        4: 'The same counter.',
        5: 'The loop now walks the REFERENCE’s distinct n-grams. We are asking what the human wrote, not what the model wrote.',
        6: 'The credit rule is identical: the smaller of the two counts.',
        7: 'The denominator is now len(ref_grams). One changed word turns precision into recall — that is the entire difference between BLEU and ROUGE.',
        9: 'The model’s five-word summary.',
        10: 'The human’s seven-word reference, which additionally says when it happened.',
        11: 'ROUGE-1 = 5/7 = 0.7143. Two reference words did not survive.',
        12: 'ROUGE-2 = 4/6 = 0.6667. Two reference pairs did not survive.',
        13: 'The same pair scored with the precision function instead: 1.0. Precision is blind to what was dropped.',
      },
    },
    {
      type: 'math',
      intro: 'The three formulas you just computed by hand, in symbols. N is the number of words, p(t_i) is the probability the model gave to word i, c is candidate length, r is reference length.',
      latex: [
        '\\text{Perplexity} \\;=\\; 2^{\\,-\\frac{1}{N}\\sum_{i=1}^{N}\\log_2 p(t_i)} \\qquad \\text{our four words: } 2^{2} = 4',
        'p_n \\;=\\; \\frac{\\text{clipped matching } n\\text{-grams}}{\\text{total } n\\text{-grams in the CANDIDATE}}, \\qquad \\text{BLEU} \\;=\\; \\text{BP}\\cdot\\Big(\\textstyle\\prod_{n=1}^{K} p_n\\Big)^{1/K}',
        '\\text{BP} \\;=\\; 1 \\text{ if } c > r, \\qquad e^{\\,1 - r/c} \\text{ if } c \\le r \\qquad \\text{our short candidate: } e^{-2} = 0.1353',
        '\\text{ROUGE-}n \\;=\\; \\frac{\\text{clipped matching } n\\text{-grams}}{\\text{total } n\\text{-grams in the REFERENCE}} \\qquad \\text{our summary: } \\tfrac{5}{7} = 0.7143',
      ],
    },
    {
      type: 'visual',
      component: 'PythonPlayground',
      props: {
        code: `ref = 'the meeting was postponed to friday'.split()
right = 'they pushed it back until friday'.split()
wrong = 'the meeting was not postponed to friday'.split()
print('correct paraphrase:', round(bleu2(right, ref), 4))
print('meaning flipped   :', round(bleu2(wrong, ref), 4))`,
        precomputedOutput: `correct paraphrase: 0.0
meaning flipped   : 0.7559`,
        caption: 'The two sentences from the opening, now scored. Word overlap rates the wrong answer 0.7559 and the right answer 0.0.',
        annotations: {
          1: 'The human reference from the first section, split into a list of six words.',
          2: 'The correct paraphrase. It shares exactly one word with the reference: "friday".',
          3: 'The sentence with the meaning reversed by inserting "not". It shares six of its seven words with the reference.',
          4: 'BLEU-2 on the correct paraphrase. Its 1-gram precision is 1/6, its 2-gram precision is 0/5, and multiplying by zero gives zero.',
          5: 'BLEU-2 on the flipped sentence: 1-gram precision 0.8571, 2-gram precision 0.6667, no brevity penalty because it is longer than the reference, so 0.7559.',
        },
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: a summariser that got better and scored worse',
      md: `A news team has a model that summarises articles. The reference summary for one article, written by an editor, is **"the board approved the merger on friday"**.

- **Version A** outputs **"the board approved the merger on friday"** — a straight copy of the article’s first sentence, which happens to match the reference word for word.
- Score it. Every reference 1-gram survives, so ROUGE-1 = 7/7 = **1.0000**. Every reference 2-gram survives, so ROUGE-2 = 6/6 = **1.0000**.
- **Version B** outputs **"directors signed off on the deal at the end of the week"** — 12 words, a genuine rewrite that a reader would call the better summary.
- Score it. Reference 1-grams surviving in the candidate: *the* appears twice in the reference and twice in the candidate, so both are credited; *board* no, *approved* no, *merger* no, *on* yes, *friday* no. That is 3 of 7. ROUGE-1 = **0.4286**.
- Reference 2-grams surviving: *the board* no, *board approved* no, *approved the* no, *the merger* no, *merger on* no, *on friday* no. ROUGE-2 = **0.0000**.
- So version A scores 1.0000 and 1.0000; version B scores 0.4286 and 0.0000.

Version A is not summarising at all — it is copying a sentence out of the article. That is the behaviour ROUGE rewards most, because copying maximises overlap by construction. The number is doing exactly what it was defined to do; it just was not defined to measure summarising. Read this as the standing warning: **do not train a model to maximise ROUGE**, because the highest-scoring strategy available to it is extraction, not summarisation.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A translation team runs two systems on the same test set and reports BLEU as a percentage, the usual convention.

- System A scores **32.4**. System B scores **32.8**. The team ships System B and writes "a 0.4 BLEU improvement" in the release notes.
- Three weeks later, human reviewers rate System B slightly *worse* than System A.
- The diagnosis. BLEU is an average over the whole test set, and averages have spread. Split the same test set into two random halves, score each half separately, and the two halves will typically disagree with each other by more than 0.4. The gap the team acted on is smaller than the noise in the measurement.
- There is a second, sharper problem. Even a real 0.4 gain in word overlap need not mean better translation, because we already proved the metric prefers a negated sentence at 0.7559 to a correct paraphrase at 0.0000. BLEU tracks quality across large gaps, not across small ones.
- The honest use of BLEU: as an **alarm**. If today’s build drops from 32.4 to 21.0, something broke and you go find it. That is a gap no amount of noise explains.
- The dishonest use: as **evidence** that one system beats another when the gap is a fraction of a point.

The general form of the mistake is treating a cheap proxy as if it were the thing it stands in for. BLEU is cheap, instant, and identical every time you run it. Those are three excellent properties, and none of them is "accurate".`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. Every number here is small on purpose.

1. A model gives these probabilities to the three words that actually appeared: 0.5, 0.5, 0.25. Compute the average surprise in bits and the perplexity.
2. List all the 1-grams and all the 2-grams of **"a b a b a"**. How many of each are there, and does the L − n + 1 rule agree?
3. Candidate **"a b c"**, reference **"a b d"**. Compute the clipped 1-gram precision, the clipped 2-gram precision, and BLEU over those two.
4. Reference summary **"rain is expected tomorrow"**, candidate **"rain tomorrow"**. Compute ROUGE-1 and the 1-gram precision. Which one notices the loss, and why?
5. A candidate repeats the reference’s first word ten times and adds nothing else. The reference has that word once and is eight words long. Compute the clipped 1-gram precision and the brevity penalty, and say which of the two repairs is doing the work.`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step, not just the final number.

1. log2(0.5) = −1, log2(0.5) = −1, log2(0.25) = −2. Signs flipped and averaged: (1 + 1 + 2)/3 = 4/3 = **1.3333 bits**. Perplexity = 2^1.3333 = **2.5198**. Sanity check: the model sits between "sure of 2 options" and "sure of 4", which matches probabilities of 0.5, 0.5, 0.25.
2. Five words, so 1-grams: *a, b, a, b, a* — **five** of them, and 5 − 1 + 1 = 5. 2-grams: *a b, b a, a b, b a* — **four**, and 5 − 2 + 1 = 4. The rule agrees. Note that *a b* appears twice; repeats are kept, which is what makes clipping necessary later.
3. 1-grams: candidate *a, b, c*; the reference contains *a* and *b* but not *c*, so **2/3 = 0.6667**. 2-grams: candidate *a b, b c*; the reference has *a b, b d*, so only *a b* matches: **1/2 = 0.5000**. Geometric average: 0.6667 × 0.5000 = 0.3333, square root = **0.5774**. Lengths are equal, so the brevity penalty is e^(1−1) = 1 and BLEU = **0.5774**.
4. Reference 1-grams: *rain, is, expected, tomorrow* — four. Surviving in the candidate: *rain* and *tomorrow*, so ROUGE-1 = **2/4 = 0.5000**. Precision: both candidate words are in the reference, so **2/2 = 1.0000**. Recall notices the loss; precision cannot, because the dropped words *is expected* left nothing in the candidate to inspect. Precision only ever examines what is present.
5. The candidate is ten copies of one word. Clipping credits it only as many times as the reference has it, which is once, so precision = **1/10 = 0.1000**. The candidate has 10 words and the reference 8, so c > r and the brevity penalty is **1.0** — it does nothing at all. Clipping is doing all the work here, which is the point: the two repairs cover different cheats. Length cheating is what the brevity penalty catches; repetition is what clipping catches.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. These are names you will hear, one line each, so they are not new when you meet them properly.

- **BLEU is a corpus-level metric.** In practice you pool the matched counts and the total counts across the entire test set and divide once, rather than averaging per-sentence BLEU scores. Per-sentence BLEU is very noisy and is often exactly 0, because a short sentence rarely matches any 4-gram at all.
- **ROUGE-L** is a third ROUGE variant that finds the longest sequence of reference words appearing in the candidate in the same order but not necessarily next to each other, then scores that. It rewards keeping content in order without committing to a fixed n.
- **BERTScore** replaces exact word matching with similarity between the models’ internal representations of the words, so *postponed* and *moved* count as a partial match. It fixes the paraphrase blindness you saw at the top and still cannot check whether anything is true.
- **LLM-as-judge** means handing the input, the output, and a written rubric to a strong language model and asking it to score or to pick a winner. It is what actually tracks human preference on open-ended tasks, and it is a separate subject with its own failure modes.
- **RAG evaluation** asks a different question again — whether every claim in the answer is supported by the documents that were retrieved. Also its own subject.
- **Bits per character** is perplexity’s chopping-proof cousin: measure surprise per character instead of per word-piece, so two models that split text differently become comparable.`,
    },
  ],
  quiz: [
    {
      question: 'A model gives probabilities 0.25, 0.25, 0.25, 0.25 to the four words that appeared. What is its perplexity?',
      options: [
        { text: '0.25', explanation: 'That is the probability itself. Perplexity is always at least 1.0, so a number below 1 cannot be one.' },
        { text: '4', explanation: 'Correct. Each word carries log2(0.25) = -2, so the average surprise is 2 bits, and 2 squared is 4 — as unsure as picking blindly among four options at every word.' },
        { text: '2', explanation: '2 is the average surprise in bits. Perplexity is 2 raised to that, which is 4.' },
      ],
      correct: 1,
    },
    {
      question: 'How many 2-grams does the sentence "the sun rose early" have?',
      options: [
        { text: '4', explanation: 'That is the number of 1-grams. Each 2-gram needs a partner to its right, so the last word starts no pair.' },
        { text: '3', explanation: 'Correct. The pairs are "the sun", "sun rose", "rose early". The rule L - n + 1 gives 4 - 2 + 1 = 3.' },
        { text: '6', explanation: 'That would be every possible pair of words in any order. n-grams are runs of adjacent words only, in the order they appear.' },
      ],
      correct: 1,
    },
    {
      question: 'A candidate outputs "good good good good" against a reference that contains "good" exactly once. What does clipping do to the 1-gram precision?',
      options: [
        { text: 'Nothing — all four words appear in the reference, so precision is 1.0', explanation: 'That is precisely the cheat clipping exists to stop. Without it a model could score perfectly by repeating one safe word.' },
        { text: 'Credits the word once, giving 1/4 = 0.25', explanation: 'Correct. Credit is capped at the number of times the reference contains that n-gram, so one of the four copies counts and the denominator stays at 4.' },
        { text: 'Sets the score to zero because the candidate repeats itself', explanation: 'Clipping caps credit, it does not zero it. The candidate did produce one word that genuinely belongs, and it gets credit for exactly that one.' },
      ],
      correct: 1,
    },
    {
      question: 'Why does BLEU multiply its n-gram precisions and take a root, instead of just averaging them normally?',
      options: [
        { text: 'Because multiplying is faster to compute', explanation: 'Speed is not the reason, and the difference is unmeasurable either way.' },
        { text: 'Because a zero in any one precision then forces the whole score to zero', explanation: 'Correct. A candidate with perfect single words but no correct adjacent pair produces a product of zero. A plain average would give it half marks for word soup.' },
        { text: 'Because the precisions are on different scales and need normalising', explanation: 'They are all fractions between 0 and 1, so they are already on the same scale.' },
      ],
      correct: 1,
    },
    {
      question: 'A summary drops "the deadline is monday" from a reference, but everything it does say is taken verbatim from the reference. Which number spots the problem?',
      options: [
        { text: 'Precision, because the candidate is shorter', explanation: 'Precision divides by the candidate’s own n-grams. Every one of them matches, so it reports 1.0 and sees nothing wrong.' },
        { text: 'ROUGE, because its denominator is the reference, so the dropped n-grams stay in the denominator and lower the score', explanation: 'Correct. A missing thing leaves no trace in the candidate, so only a score measured against the reference can register the loss.' },
        { text: 'The brevity penalty', explanation: 'The brevity penalty belongs to BLEU and only scales a precision score by length. It does not look at which content was lost, and ROUGE does not use it at all.' },
      ],
      correct: 1,
    },
    {
      question: 'Two translation systems score 32.4 and 32.8 BLEU on the same test set. What is the right conclusion?',
      options: [
        { text: 'The second system is better and should ship', explanation: 'A 0.4 gap is typically smaller than the disagreement between two random halves of the same test set. The gap sits inside the measurement noise.' },
        { text: 'The gap is too small to support a claim either way — BLEU is an alarm for large drops, not evidence for small gains', explanation: 'Correct. Use it to catch a build that fell from 32.4 to 21.0. Do not use it to rank two systems separated by a fraction of a point.' },
        { text: 'The systems are identical', explanation: 'They may well differ a lot; BLEU simply cannot tell you how, since it prefers a negated sentence to a correct paraphrase.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is perplexity, and what does a perplexity of 30 mean in plain words?',
      answer:
        'Perplexity is the model’s average surprise on real text, rewritten as a number of choices. You take the probability the model assigned to each word that actually appeared, take the log of each, average them, flip the sign, and raise 2 to that average. A perplexity of 30 means the model was, on average, as unsure as someone picking blindly among 30 equally likely words at every step. Lower is better and the floor is 1.0, which would mean it gave probability 1 to every word it saw. Worked small: probabilities 0.5, 0.25, 0.125, 0.25 give surprises of 1, 2, 3, 2 bits, average 2, so perplexity is 4. Because the underlying combination is a product of probabilities, one shocking word dominates: change that 0.125 to 0.001 and perplexity jumps from 4 to 13.4.',
      isCaseBased: false,
    },
    {
      question: 'Why can you not compare your model’s perplexity against a perplexity printed in a paper?',
      answer:
        'Two reasons, both structural. First, perplexity is measured per word-piece, and models chop text into pieces differently. A model with a larger vocabulary makes fewer, harder predictions over the same text, so its per-piece surprise is not the same quantity as that of a model splitting the same text into twice as many pieces. Change only the chopping and the number moves with no change in quality. Second, perplexity depends entirely on the text you measure it on — a number from a news corpus and a number from a code corpus are unrelated quantities. Perplexity is valid for comparing checkpoints of your own model on your own held-out set, which is the job it is genuinely good at. If you need a cross-model number, bits per character removes the chopping problem, but the corpus problem stays.',
      isCaseBased: false,
    },
    {
      question: 'Explain the difference between BLEU and ROUGE, and why each was built the way it was.',
      answer:
        'Both count how many n-grams — runs of n adjacent words — the candidate and the reference share. They differ in one place: the denominator. BLEU divides by the candidate’s n-grams, which makes it precision: of what you produced, how much belongs. ROUGE divides by the reference’s n-grams, which makes it recall: of what the human wrote, how much survived. That follows from the tasks. A translation must not add anything, so you police what the candidate contains. A summary must not drop anything, so you police what the reference lost. Worked example: reference "the board approved the merger on friday", candidate "the board approved the merger". Precision is 5/5 = 1.0 and calls the summary flawless; ROUGE-1 is 5/7 = 0.71 and correctly notices the date is gone. BLEU also carries two repairs ROUGE does not need: clipping and a brevity penalty.',
      isCaseBased: false,
    },
    {
      question: 'What are clipping and the brevity penalty, and which cheat does each one stop?',
      answer:
        'They stop two different ways of scoring well without translating. Clipping stops repetition: without it, a candidate of "the the the the the the" has every word present in the reference and scores a perfect 1.0. Clipping caps credit for an n-gram at the number of times the reference contains it, so if the reference has "the" twice, only two of the six copies count and precision falls to 2/6 = 0.33. The brevity penalty stops truncation: outputting just "the mat" gives perfect 1-gram and 2-gram precision on a two-word non-answer. So when the candidate is shorter than the reference, BLEU multiplies by e^(1 - r/c) — with r = 6 and c = 2 that is e to the minus 2, or 0.1353, which destroys the score. Long candidates need no penalty, because every extra unmatched word already enlarges the precision denominator.',
      isCaseBased: false,
    },
    {
      question: 'Case: your summarisation model’s ROUGE-2 rose from 0.31 to 0.44 after a change, but human reviewers say the summaries got worse. Diagnose it.',
      answer:
        'First hypothesis, before asking anything: the model learned to copy. ROUGE measures how many of the reference’s n-grams survive in the candidate, and the most reliable way to make reference n-grams survive is to lift sentences verbatim out of the source document, since the human reference was itself written from that document. Extraction beats abstraction on this metric by construction. The check is cheap and decisive: measure, for each output, the length of the longest run of words copied word-for-word from the source article, and compare the distribution before and after the change. If the copied runs got longer, that is the whole story. Second hypothesis: output length grew. ROUGE is pure recall with no length penalty at all, so a longer summary can only ever score the same or better — a model that pastes three whole paragraphs approaches ROUGE-2 of 1.0. Check mean output length. If either is true, the metric is not broken, it is being maximised. The repair is to stop using recall alone as the target: report a precision-and-recall pair or an F-measure so that padding costs something, cap the output length, and validate against human ratings on a fixed sample before trusting any future move in the number. Said plainly: a 0.13 rise in ROUGE-2 with human ratings falling is the proxy and the goal disagreeing, and when they disagree the humans are the ground truth.',
      isCaseBased: true,
    },
    {
      question: 'Case: a teammate wants to fine-tune a translation model by directly maximising BLEU. What do you tell them?',
      answer:
        'Two separate objections, one mechanical and one about the goal. Mechanical: BLEU is built by counting matched n-grams, and a count only changes when a word changes, so as a function of the model’s weights it is a staircase — flat almost everywhere, with jumps. Gradient descent sizes each step by a slope, and a slope of zero produces a step of zero, so you cannot descend it directly. Getting a usable signal requires sampling-based methods that are far noisier and slower than ordinary training. Second, and more important: even if you could, you would be optimising the wrong thing. We can show BLEU scoring a meaning-flipped sentence at 0.7559 and a correct paraphrase at 0.0000 against the same reference. A model pushed hard against that target learns to reproduce the reference’s surface words, which means copying source phrasing and avoiding legitimate rewording. The productive framing: BLEU is a regression alarm you run on every build to catch a large drop, not a target. Train on cross-entropy, and if you want to optimise for judged quality, use human ratings or a judge you have validated against human ratings as the signal.',
      isCaseBased: true,
    },
    {
      question: 'Why do teams still use BLEU and ROUGE when everyone agrees they miss meaning?',
      answer:
        'Because they have three properties that nothing better has all of. They are cheap — milliseconds on a CPU, so you can run them on every commit. They are deterministic — the same input gives the same number today and in three years, so a build that drops is a real signal and not measurement drift. And they are comparable — a result from 2016 and a result from 2025 on the same test set can be placed side by side, which no metric depending on a model version can promise, because upgrading the judge or the embedding model silently invalidates every historical number. The professional position is not that they are good, it is that they are a stable, free tripwire. Use them to detect that something broke. Use human ratings, or a judge validated against human ratings, to decide that something improved.',
      isCaseBased: false,
    },
    {
      question: 'Case: two chatbot versions are evaluated. Version A has lower perplexity on held-out chat logs; version B is preferred by 70% of human raters. Which ships?',
      answer:
        'Version B, and the interesting part is why the two numbers can disagree without either being wrong. Perplexity measures one thing only: the probability the model assigns to text that already exists. It rewards a model for predicting the logged conversations well, and those logs were produced by whatever system was running at the time, so a model that imitates the old system’s style scores well by construction. Nothing in perplexity asks whether an answer is correct, helpful, or safe — those properties are invisible to it. Human preference measures the thing the product is for. So when they conflict, preference wins. Before shipping I would run three checks. First, confirm the preference result is real and not noise: 70% over how many comparisons, with what confidence interval, and were the two versions shown in randomised order. Second, check whether B’s higher perplexity comes from a deliberate change such as instruction tuning, which is known to raise perplexity on generic text while improving answers — that would explain the gap completely. Third, look for a regression that preference ratings would not surface, such as a rise in refusals on harmless requests or a fall in factual accuracy on a fixed probe set. If those are clean, ship B, and keep perplexity as a training-health signal rather than a quality metric.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Perplexity, in one line', back: '2 raised to the average per-word surprise. Reads as "as unsure as picking blindly among this many options". Probabilities 0.5, 0.25, 0.125, 0.25 give surprises 1, 2, 3, 2 bits, average 2, perplexity 4. Floor is 1.0, lower is better.' },
    { front: 'Why perplexity punishes one bad word so hard', back: 'It equals 1 divided by the geometric average of the probabilities, and a geometric average is a product. One tiny factor drags the whole product down. Changing 0.125 to 0.001 in a four-word sentence moves perplexity from 4.00 to 13.37.' },
    { front: 'n-gram', back: 'A run of n adjacent words. "the cat sat on the mat" has six 1-grams, five 2-grams, four 3-grams. A sentence of L words has L - n + 1 n-grams. Pairs and triples are how a word-counting metric sees word order at all.' },
    { front: 'BLEU vs ROUGE, the one difference', back: 'Same matched-n-gram numerator, different denominator. BLEU divides by the CANDIDATE (precision — a translation must not add). ROUGE divides by the REFERENCE (recall — a summary must not drop).' },
    { front: 'Clipping', back: 'An n-gram gets credit at most as many times as the reference contains it. Stops "the the the the the the" from scoring 1.0: the reference has "the" twice, so 2/6 = 0.3333.' },
    { front: 'Brevity penalty', back: 'Multiply BLEU by e^(1 - r/c) when the candidate length c is at most the reference length r, otherwise by 1. Candidate "the mat" against a six-word reference: e^(1-3) = 0.1353, which kills its perfect precisions.' },
    { front: 'The blind spot, in numbers', back: 'Reference "the meeting was postponed to friday". A correct paraphrase using different words scores BLEU 0.0000. The same sentence with "not" inserted, meaning reversed, scores 0.7559.' },
    { front: 'Honest use of BLEU and ROUGE', back: 'A regression alarm: a drop from 32.4 to 21.0 means something broke. Not evidence: 32.4 versus 32.8 sits inside the noise. And never a training target — maximising ROUGE teaches a summariser to copy sentences verbatim.' },
  ],
  mindmapMarkdown: `- Text generation metrics
  - The problem
    - correct paraphrase shares 1 word of 6
    - flipped meaning shares 6 words of 7
    - counting words cannot see meaning
  - Perplexity
    - probabilities 0.5 0.25 0.125 0.25
    - surprises 1 2 3 2 bits, average 2
    - perplexity = 2^2 = 4
    - = 1 / geometric average of the probabilities
    - one shocked word: 4.00 to 13.37
    - per word-piece, so not comparable across models
  - KL divergence, briefly
    - cross-entropy = unavoidable surprise + KL
    - toy: 0.4690 + 0.5310 = 1.0000 bits
    - zero only when the two distributions match
  - n-grams
    - runs of n adjacent words
    - "the cat sat on the mat": 6 unigrams, 5 bigrams
    - L - n + 1 of them
  - BLEU
    - precision: divide by the candidate
    - 1-gram 5/6, 2-gram 3/5, geometric average 0.7071
    - clipping stops repetition
    - brevity penalty stops truncation
  - ROUGE
    - recall: divide by the reference
    - ROUGE-1 5/7 = 0.7143, ROUGE-2 4/6 = 0.6667
    - precision on the same pair says 1.0 and sees nothing
  - The classic mistakes
    - 32.4 vs 32.8 BLEU is noise, not a result
    - maximising ROUGE teaches copying, not summarising
  - Beyond the basics
    - corpus-level BLEU, ROUGE-L
    - BERTScore, LLM-as-judge, RAG faithfulness
    - bits per character`,
}

export default m
