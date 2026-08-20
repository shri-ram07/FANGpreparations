import type { Module } from '../types'

const m: Module = {
  id: 'genai-l0-tokenization',
  subjectId: 'genai',
  level: 0,
  title: 'Tokenization: How Text Becomes Numbers',
  whyItMatters:
    'A language model does arithmetic. Arithmetic needs numbers. Text is not numbers, so something has to convert one into the other before the model sees a single word — and that converter is the tokenizer. This module builds one by hand, on a five-word corpus, with every count written out. By the end you will know exactly why a model cannot count the letters in "strawberry", why a Hindi sentence costs three times more than the same sentence in English, and why "128k context" is not 128k words.',
  assumes: [
    'You know what a Python list and a Python dictionary are',
    'You have written a for loop and an if statement',
    'You know that a string is a sequence of characters',
    'No machine learning background is needed. Every term is defined on this page, the first time it is used.',
  ],
  estMinutes: 46,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: "hello" is not a number',
      md: `A neural network is a large pile of multiplications and additions. You feed it numbers, it multiplies them by other numbers, and numbers come out. There is no operation in it that accepts the letter **h**.

- So before anything else happens, the text you typed has to be replaced by a list of whole numbers. For example \`"hello there"\` might become \`[15339, 1070]\`.
- The piece of software that does this replacement is called the **tokenizer**. It runs before the model and has no learned intelligence of its own.
- It also has to run backwards: the model produces numbers, and those numbers have to become readable text again.

The whole question of this module is: **what should each number stand for?** That choice sounds like a small engineering detail. It is not. It decides how much your API calls cost, how much text fits in one request, and which tasks the model is quietly incapable of.`,
    },
    {
      type: 'intuition',
      title: 'Three ways to cut text into numbers',
      md: `You need a rule that chops text into pieces, and then a number for each distinct piece. There are three obvious rules. Two of them fail, and the reason each one fails is worth holding on to.

**Option 1 — one number per character.** \`h\`=1, \`e\`=2, \`l\`=3, and so on. About 100 different pieces covers English. Nothing is ever missing: any word you have never seen is still made of letters you already have numbers for. The failure is that a single letter means almost nothing. The model gets \`t\`, \`h\`, \`e\` as three separate numbers and has to work out for itself, from scratch, that those three in a row are the word "the". And text gets long: the word "internationalization" is one idea but twenty numbers. Later modules will show that the cost of processing a sequence grows with the *square* of its length, so four times longer is roughly sixteen times more expensive.

**Option 2 — one number per word.** \`the\`=1, \`cat\`=2, \`internationalization\`=3. Now each number carries real meaning and the list is short. Two things kill it. First, the list of distinct words is enormous: over 200,000 for English before you count names, typos, URLs and product codes. Second and worse, the list has to be fixed in advance. When a word arrives that was not on the list — a new slang word, a misspelling, a surname — there is no number for it. It gets replaced by a single "unknown" number and the actual content is gone permanently.

**Option 3 — the compromise: cut into frequent pieces.** Do not commit to letters or to whole words. Let common words stay whole, and let rare words break into a few pieces. "the" is one piece. "tokenization" becomes "token" + "ization". Now the list of distinct pieces is a manageable 30,000 to 200,000, text stays reasonably short, and nothing is ever unrepresentable because a truly strange word can always fall back to its letters. This is what every real language model uses.`,
    },
    {
      type: 'intuition',
      title: 'The four words you need',
      md: `Now that you have seen the idea, here are the names, each one in plain words.

- A **token** is one piece that the chopping rule produced. It might be a whole word, a fragment of a word, a space, or a single letter. It is whatever the tokenizer decided to treat as one unit.
- The **vocabulary** is the complete, fixed list of every token the tokenizer knows. Its length is usually written **V**. If V is 50,000, there are exactly 50,000 distinct tokens in the world as far as this model is concerned.
- A **token id** is simply the position of a token in that list. If "the" is entry number 464, then the token id of "the" is 464. The number itself means nothing else — id 465 is not "bigger" or "next to" id 464 in any meaningful sense.
- A **subword** is a token that is part of a word rather than a whole word. "ization" is a subword.

So tokenizing is two steps: chop the text into tokens, then look up each token's position in the vocabulary. The output is a list of integers. That is all the model ever receives.`,
    },
    {
      type: 'intuition',
      title: 'Byte-pair encoding: how the pieces are chosen',
      md: `Option 3 left a question open: who decides which pieces are worth having? Nobody writes that list by hand. It is discovered from data, by an algorithm called **byte-pair encoding**, or **BPE**. It was invented in 1994 to compress files, and it is five steps long.

1. Take a big pile of text and count how many times each word appears.
2. Split every word into individual characters. The vocabulary starts as just the distinct characters.
3. Count every **adjacent pair** of neighbouring symbols across the whole pile, where a word appearing 12 times contributes 12 to each of its pairs.
4. Find the most frequent pair and **merge** it: everywhere those two symbols sit side by side, glue them into one new symbol, and add that new symbol to the vocabulary.
5. Go back to step 3 and repeat, as many times as you want. Each repetition adds exactly one new token to the vocabulary.

A **merge** is that gluing operation — one rule saying "these two symbols become one". The result of training is an **ordered list of merges**, and that list is the entire tokenizer. There is nothing else in the file.`,
    },
    {
      type: 'intuition',
      title: 'Three merges, worked by hand',
      md: `Take a corpus of five words, with the number of times each one appears: **hug** 10 times, **pug** 5, **pun** 12, **bun** 4, **hugs** 5.

Split them into characters: \`h u g\`, \`p u g\`, \`p u n\`, \`b u n\`, \`h u g s\`. The starting vocabulary is the distinct characters: b, g, h, n, p, s, u — **7 symbols**.

Count how many tokens the whole corpus takes right now. Each copy of "hug" is 3 tokens and there are 10 copies, so 30. Then pug 3 x 5 = 15, pun 3 x 12 = 36, bun 3 x 4 = 12, hugs 4 x 5 = 20. Total: 30 + 15 + 36 + 12 + 20 = **113 tokens**.

**Merge 1.** Count every adjacent pair, weighting each word by how often it appears. The pair \`u g\` appears inside hug (10), pug (5) and hugs (5), so its count is 20. The pair \`p u\` appears in pug (5) and pun (12), so 17. \`u n\` is in pun (12) and bun (4), so 16. \`h u\` is in hug (10) and hugs (5), so 15. \`g s\` is 5 and \`b u\` is 4. The winner is \`u g\` with 20. Glue it: the corpus becomes \`h ug\`, \`p ug\`, \`p u n\`, \`b u n\`, \`h ug s\`. The vocabulary is now 8 symbols, and the corpus shrank by exactly 20 tokens, from 113 to **93** — one token saved for each place the merge applied.

**Merge 2.** Recount from the new corpus, because merging changed which pairs exist. Now \`u n\` leads with 16, ahead of \`h ug\` at 15 and \`p u\` at 12. Merge it. Vocabulary 9, tokens 93 - 16 = **77**.

**Merge 3.** Recount again. \`h ug\` now wins with 15. Notice what this merge is doing: it glues a single character onto a symbol that was itself created by merge 1. This is how long tokens get built — merges stack on earlier merges. The corpus becomes \`hug\`, \`p ug\`, \`p un\`, \`b un\`, \`hug s\`. Vocabulary 10, tokens 77 - 15 = **62**.

Three merges took the vocabulary from 7 to 10 and the corpus from 113 tokens to 62. Nobody decided that "hug" deserved to be one token. Frequency decided it. And "bun", being rare, is still two pieces.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: split into characters and build the starting vocabulary',
      code: `corpus = {'hug': 10, 'pug': 5, 'pun': 12, 'bun': 4, 'hugs': 5}
words = {}
for w in corpus:
    words[w] = list(w)
print(words)

vocab = []
for w in corpus:
    for ch in w:
        if ch not in vocab:
            vocab.append(ch)
vocab.sort()
print(vocab, len(vocab))

# ---- real output ----
# {'hug': ['h', 'u', 'g'], 'pug': ['p', 'u', 'g'], 'pun': ['p', 'u', 'n'], 'bun': ['b', 'u', 'n'], 'hugs': ['h', 'u', 'g', 's']}
# ['b', 'g', 'h', 'n', 'p', 's', 'u'] 7`,
      annotations: {
        1: 'A dictionary from each word to how many times it appears. This word-count is the only thing BPE training ever looks at — real trainers build it from gigabytes of text first.',
        2: 'An empty dictionary that will hold, for each word, its current list of symbols.',
        3: 'Looping over a dictionary gives you its keys, so w takes the values \'hug\', \'pug\', \'pun\', \'bun\', \'hugs\' in turn.',
        4: 'list(\'hug\') turns a string into a list of its single characters: [\'h\', \'u\', \'g\']. This is step 2 of the algorithm — every word starts fully split.',
        5: 'Prints the five words in their split form, so you can see the starting state.',
        7: 'An empty list that will become the starting vocabulary.',
        8: 'Walk the words again, this time to collect characters rather than split them.',
        9: 'Loop over the characters of one word. Looping over a string gives one character at a time.',
        10: 'The "in" operator asks whether this character is already in the list. Skipping duplicates is what makes the result a set of DISTINCT characters.',
        11: 'Add a character we have not seen before to the vocabulary.',
        12: '.sort() reorders the list alphabetically in place. Purely so the printed output is readable; order does not affect the algorithm.',
        13: 'Prints the starting vocabulary and its size: 7 symbols, exactly as counted by hand.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: count adjacent pairs, and count total tokens (paste below Part 1)',
      code: `def count_pairs(words):
    counts = {}
    for w in words:
        toks = words[w]
        for i in range(len(toks) - 1):
            pair = (toks[i], toks[i + 1])
            counts[pair] = counts.get(pair, 0) + corpus[w]
    return counts

def total_tokens(words):
    n = 0
    for w in words:
        n = n + len(words[w]) * corpus[w]
    return n

print(count_pairs(words))
print('total tokens in corpus:', total_tokens(words))

# ---- real output ----
# {('h', 'u'): 15, ('u', 'g'): 20, ('p', 'u'): 17, ('u', 'n'): 16, ('b', 'u'): 4, ('g', 's'): 5}
# total tokens in corpus: 113`,
      annotations: {
        1: 'Takes the dictionary of split words and returns a count for every adjacent pair. This is step 3 of the algorithm.',
        2: 'The counts we are building. Keys will be pairs, values will be numbers.',
        3: 'Go through each word in the corpus.',
        4: 'Pull out this word\'s current list of symbols, so the next lines are easier to read.',
        5: 'len(toks) - 1 is the number of adjacent pairs in a list: 3 symbols have 2 neighbouring pairs. Stopping one short avoids running off the end.',
        6: 'Build the pair as a tuple — two values wrapped in parentheses. A tuple can be a dictionary key; a list cannot, which is the only reason a tuple is used here.',
        7: 'counts.get(pair, 0) returns the count so far, or 0 if this pair is new. We add corpus[w], NOT 1 — a word appearing 12 times votes 12 times for each of its pairs.',
        8: 'Hand the finished count dictionary back to the caller.',
        10: 'A separate helper that measures how big the corpus currently is, in tokens.',
        11: 'A running total, starting at zero.',
        12: 'Visit every word.',
        13: 'len(words[w]) is how many symbols this word is currently split into; corpus[w] is how many copies of it exist. Multiply, and add.',
        14: 'Return the total.',
        16: 'Prints all six pair counts. Compare them to the hand-worked numbers: u+g is 20, p+u is 17, u+n is 16, h+u is 15.',
        17: 'Prints 113, the same total we computed by hand.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 3: pick the winning pair (paste below Part 2)',
      code: `def best_pair(counts):
    best = None
    for pair in counts:
        if best is None or counts[pair] > counts[best]:
            best = pair
    return best

print(best_pair(count_pairs(words)))

# ---- real output ----
# ('u', 'g')`,
      annotations: {
        1: 'Takes the pair counts and returns the single most frequent pair. This is the first half of step 4.',
        2: 'best holds the winner found so far. None is Python\'s "nothing here yet" value, used because we have not seen any pair yet.',
        3: 'Loop over the keys of the counts dictionary, which are the pairs.',
        4: 'Two cases joined by "or": if we have no winner yet, take this pair; otherwise take it only if its count beats the current winner\'s count. This is a plain maximum search.',
        5: 'Record the new winner.',
        6: 'Return the winning pair after the whole dictionary has been checked.',
        8: 'Prints the winner of round one. It is (\'u\', \'g\') with 20 — greedy, with no lookahead and no attempt to plan future merges. If two pairs tie, whichever came first wins, which is why two BPE implementations can disagree on ties.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 4: apply a merge to one word (paste below Part 3)',
      code: `def merge(toks, a, b):
    out = []
    i = 0
    while i < len(toks):
        if i < len(toks) - 1 and toks[i] == a and toks[i + 1] == b:
            out.append(a + b)
            i = i + 2
        else:
            out.append(toks[i])
            i = i + 1
    return out

print(merge(['h', 'u', 'g', 's'], 'u', 'g'))

# ---- real output ----
# ['h', 'ug', 's']`,
      annotations: {
        1: 'Takes one word\'s symbol list and the two symbols to glue together. This is the second half of step 4.',
        2: 'The rebuilt symbol list. We do not edit the original list while walking it — that is a classic source of bugs — we build a new one.',
        3: 'A manual position counter. A while loop is used instead of a for loop precisely because we sometimes need to skip forward by two.',
        4: 'Keep going until the counter reaches the end of the list.',
        5: 'Three conditions joined by "and": there is a next symbol to look at, this symbol equals a, and the next one equals b. All three must hold for a merge here.',
        6: 'a + b joins the two strings into one, so \'u\' + \'g\' becomes the single symbol \'ug\'. Append it once.',
        7: 'Skip forward by two, because both symbols were consumed by the merge.',
        8: 'Otherwise there is no merge at this position.',
        9: 'Copy the symbol across unchanged.',
        10: 'Move forward by one.',
        11: 'Return the rebuilt list.',
        13: 'A test on the word "hugs": merging u and g turns [\'h\', \'u\', \'g\', \'s\'] into [\'h\', \'ug\', \'s\'] — one symbol shorter, exactly as expected.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 5: the training loop, three merges (paste below Part 4)',
      code: `merges = []
for step in range(3):
    counts = count_pairs(words)
    a, b = best_pair(counts)
    merges.append((a, b))
    vocab.append(a + b)
    for w in words:
        words[w] = merge(words[w], a, b)
    print('merge', step + 1, a + b, 'seen', counts[(a, b)], '| vocab', len(vocab), '| tokens', total_tokens(words))
    print('   corpus:', words)

# ---- real output ----
# merge 1 ug seen 20 | vocab 8 | tokens 93
#    corpus: {'hug': ['h', 'ug'], 'pug': ['p', 'ug'], 'pun': ['p', 'u', 'n'], 'bun': ['b', 'u', 'n'], 'hugs': ['h', 'ug', 's']}
# merge 2 un seen 16 | vocab 9 | tokens 77
#    corpus: {'hug': ['h', 'ug'], 'pug': ['p', 'ug'], 'pun': ['p', 'un'], 'bun': ['b', 'un'], 'hugs': ['h', 'ug', 's']}
# merge 3 hug seen 15 | vocab 10 | tokens 62
#    corpus: {'hug': ['hug'], 'pug': ['p', 'ug'], 'pun': ['p', 'un'], 'bun': ['b', 'un'], 'hugs': ['hug', 's']}`,
      annotations: {
        1: 'The merge list we are about to build. This list is the trained tokenizer — everything else in this file is scaffolding.',
        2: 'range(3) gives 0, 1, 2, so the loop body runs three times: three merges.',
        3: 'Recount the pairs from the CURRENT corpus. Recounting every round is essential, because the previous merge changed which pairs exist.',
        4: 'best_pair returns a tuple of two symbols, and "a, b =" unpacks it into two separate variables in one line. This is called tuple unpacking.',
        5: 'Record the merge, in order. Order will matter when we encode new text.',
        6: 'The glued symbol becomes a new vocabulary entry. One merge, one new token — which is why vocabulary size is just base characters plus number of merges.',
        7: 'Now apply the merge to every word in the corpus.',
        8: 'Replace each word\'s symbol list with the merged version.',
        9: 'Print the round number, the new symbol, how often the merged pair was seen, and the two numbers that tell the story: vocabulary size and total corpus tokens.',
        10: 'Print the corpus itself so you can watch the words fuse. By round 3, \'hug\' is a single symbol.',
      },
    },
    {
      type: 'note',
      md: 'Read the three output lines as a pair of trends. The vocabulary goes 8, 9, 10 — up by exactly one each round, because each merge adds one symbol. The token count goes 93, 77, 62 — down by exactly the number of times the merged pair was seen, because every place the merge applied turned two tokens into one. That is the whole trade: **you spend vocabulary entries to buy shorter text.** Every real tokenizer is this loop run tens of thousands of times on a large pile of internet text.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 6: tokenize new words by replaying the merges (paste below Part 5)',
      code: `def encode(word):
    toks = list(word)
    for pair in merges:
        toks = merge(toks, pair[0], pair[1])
    return toks

for w in ['hug', 'hugs', 'bun', 'mug']:
    print(w, '->', encode(w), '|', len(w), 'chars ->', len(encode(w)), 'tokens')

# ---- real output ----
# hug -> ['hug'] | 3 chars -> 1 tokens
# hugs -> ['hug', 's'] | 4 chars -> 2 tokens
# bun -> ['b', 'un'] | 3 chars -> 2 tokens
# mug -> ['m', 'ug'] | 3 chars -> 2 tokens`,
      annotations: {
        1: 'Tokenizing a brand new word. Note what this function does NOT do: it never counts anything and never looks at the corpus. Training happened once; this is just replay.',
        2: 'Start from scratch, fully split into characters, exactly as training started.',
        3: 'Walk the merge list in the order it was learned.',
        4: 'Apply that one merge to the whole word, using the same merge function from Part 4. pair[0] and pair[1] are the two symbols of the tuple.',
        5: 'Whatever symbols survive all the merges are the tokens.',
        7: 'Four test words: two the trainer saw, one it saw only as part of a bigger word, and one it never saw at all.',
        8: 'Print the word, its tokens, and how many characters became how many tokens.',
      },
    },
    {
      type: 'note',
      md: 'Three things in that output are the whole module in miniature. **"hug" is one token** because it was frequent enough to earn a merge. **"bun" is two tokens** because it was rare — same length, twice the cost. And **"mug" contains the letter m, which never appeared in training**, so this tokenizer has no symbol for it at all. A character-level tokenizer would have to give up here and emit an "unknown" marker. The next section shows the trick that makes this impossible in real systems.',
    },
    {
      type: 'intuition',
      title: 'Real tokenizers start from bytes, not characters',
      md: `The "mug" failure is not acceptable in production, where the input might be any language, an emoji, or a corrupted paste. GPT-2 fixed it with one small change: **do not start from characters, start from bytes.**

- A **byte** is a number from 0 to 255. Every piece of text stored on a computer is, underneath, a sequence of bytes. English letters take one byte each; other scripts take more.
- So make the starting vocabulary the 256 possible byte values, then run exactly the loop you just wrote on byte sequences instead of character sequences.
- Now nothing can ever be unrepresentable, because every possible input is already a sequence of bytes. There is no "unknown" case left to handle.
- The price: characters outside the English alphabet cost several bytes each, so they start life shattered into more pieces. The letter \`é\` is 2 bytes. A Chinese character is 3. A Devanagari character is 3, so \`नमस्ते\` is 6 characters but 18 bytes.
- Whether that matters depends entirely on the training pile. If it contained plenty of Hindi, BPE will have merged those byte runs back into whole Hindi tokens and you never notice. If it did not, Hindi stays near the byte level and costs three to four times more tokens than the same meaning in English.`,
    },
    { type: 'visual', component: 'TokenizerDemo', props: {} },
    {
      type: 'note',
      md: 'Step the demo above one merge at a time and watch frequent pieces fuse: `t` and `h` become `th`, then `the`, and eventually `trans` and `former` slam together into a single `transformer` token. Then switch to the sample `zyxwv quartz` and step to the very end — it stays shattered into single characters, because no merge in the list ever saw those letter pairs. Common text is cheap, rare text is expensive, and that is decided entirely by what was in the training pile.',
    },
    {
      type: 'intuition',
      title: 'Why the model cannot count the r\'s in "strawberry"',
      md: `This is the most famous LLM failure, and the cause is not stupidity. The information is genuinely not there.

- "strawberry" reaches the model as a small number of token ids — commonly reported as three pieces, \`str\` + \`aw\` + \`berry\`, for GPT-4's tokenizer. Three integers, and nothing else.
- An integer does not expose its spelling. Asking the model to count the r's is like asking you to count the letters in a phone number after someone told you "it's the Johnson house line". You know what it refers to. You were never given the characters.
- The model often answers correctly anyway, because training text talks *about* spelling. It is recalling a fact, not inspecting a word — which is exactly why it is confidently wrong on unusual words.
- The same cause explains the whole family: reversing a string, rhyming, counting syllables, pig latin, and "give me words starting with q".
- Arithmetic has a related problem. Depending on the tokenizer, "1234" may be one token, or \`123\` + \`4\`, while "1235" splits somewhere else — so digits do not line up by place value and the model cannot learn clean column addition. Some model families now force every digit into its own token for exactly this reason, and it measurably helps.

The production fix is not a cleverer prompt. Give the model a tool: a calculator, a \`len()\` call, a regular expression. Character-level work belongs in code.`,
    },
    {
      type: 'intuition',
      title: 'The context window, and what it costs you',
      md: `A model can only look at a limited amount of text at once. That limit is the **context window**, and it is measured **in tokens, not words or characters**. A "128k context window" means 128,000 token ids — the prompt, the retrieved documents, the conversation history and the model's own reply all have to fit inside that one number together.

Useful rules of thumb for English prose, which come straight from the ~4-characters-per-token behaviour of real tokenizers:

- About **4 characters per token**, or about **0.75 words per token**. So 1,000 tokens is roughly 750 English words, roughly 4,000 characters, roughly one and a half pages.
- **Code is worse** — indentation, braces and \`snake_case\` names all fragment. Budget nearer 3 characters per token.
- **Devanagari, Chinese, Arabic and Thai are much worse** — nearer 1.5 characters per token, for the byte reason above.

The concrete consequence: a 128k window holds about 96,000 English words, but perhaps 30,000 words of Hindi. Same model, same window, a third of the room — and, since you are billed per token, three times the price for the same conversation. This is also why a chat gets more expensive as it goes: the entire history is re-sent as tokens on every single turn.`,
    },
    {
      type: 'note',
      md: 'One more kind of token exists that never came from a merge. A **special token** is a reserved vocabulary entry that carries structure rather than text: one marks the end of a document or of a generation, one marks a start, one pads a short input so a batch of inputs has equal length. Chat models add more of them — the `system`, `user` and `assistant` roles you pass to an API are rendered into special tokens like `<|im_start|>user` before the text ever reaches the model. Two consequences worth knowing now: those wrapper tokens are charged to you on every turn, and a user who types a role marker into their message is attempting the first step of a prompt injection, which is why tokenizers refuse to produce special tokens from ordinary user text.',
    },
    {
      type: 'intuition',
      title: 'Where a token id goes next: it is a row number',
      md: `One loose end, and it is the handoff to the rest of deep learning. The tokenizer hands over integers, and an integer carries no meaning — id 464 is not "more" than id 262. Meaning arrives one step later.

Sitting immediately after the tokenizer is a single learned table with one row per vocabulary entry. **The token id is nothing but the row number.** Looking up an embedding is literally "fetch row 464" — a memory read, not a calculation. That is exactly why the ids themselves are allowed to be arbitrary: they are addresses, not values. The rows start as random numbers and are learned during training, and tokens that appear in similar contexts drift towards similar rows.

That table is where meaning actually lives, and it is a whole topic of its own. It is taught in the deep learning module *Embeddings: Meaning as Vectors*. Do not chase it here. Just hold the seam: **the tokenizer produces row numbers; the embedding table turns them into vectors.**`,
    },
    {
      type: 'intuition',
      title: 'Worked case: budgeting a support-bot request by hand',
      md: `You are building a support bot. Per request it sends: a system prompt of 1,200 characters of English, three retrieved help-centre articles of 3,000 characters each, and a user question of about 200 characters. The model replies with about 600 characters. Pricing is 2 rupees per million input tokens and 8 rupees per million output tokens. Estimate the cost of 100,000 requests a month.

Step 1, convert each part to tokens at 4 characters per token. System prompt: 1,200 / 4 = 300 tokens. Articles: 3 x 3,000 = 9,000 characters, so 9,000 / 4 = 2,250 tokens. Question: 200 / 4 = 50 tokens. Input total: 300 + 2,250 + 50 = **2,600 tokens**. Output: 600 / 4 = **150 tokens**.

Step 2, price one request. Input: 2,600 x 2 / 1,000,000 = 0.0052 rupees. Output: 150 x 8 / 1,000,000 = 0.0012 rupees. Total 0.0064 rupees per request.

Step 3, scale it. 0.0064 x 100,000 = **640 rupees a month**. Note that the retrieved articles are 2,250 of the 2,600 input tokens — 87% of the input bill is retrieval, so that is the only place worth optimising.

Step 4, redo it for Hindi users, at roughly 1.5 characters per token instead of 4. The same input becomes 10,400 / 1.5 = 6,933 tokens instead of 2,600, and the output 400 instead of 150. Input 0.0139 rupees, output 0.0032, total 0.0171 per request — **1,710 rupees a month, 2.7 times the English figure for identical content.** Nothing about the model changed. Only the tokenizer's opinion of Devanagari did.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `Same support bot. A colleague estimates it differently: "the articles are about 500 words each, three of them is 1,500 words, plus a hundred words of prompt and question — call it 1,600 tokens. One word, one token. We have an 8,000-token window, so we can easily fit eight articles instead of three."

Follow that to the end. Eight articles at 500 words each is 4,000 words. At one token per word that is 4,000 tokens, comfortably inside 8,000. So they ship it.

In production it breaks. The real count, at 0.75 words per token, is 4,000 / 0.75 = **5,333 tokens** for the articles alone. Add the system prompt and question, about 1,600 / 0.75 = 2,133 more... and the total is 7,466 tokens before the model has written a single word of reply. There is almost no room left for the answer, so replies get truncated mid-sentence. Non-English requests overflow the window entirely and the API returns an error. The cost estimate was also understated by a third.

Two separate errors are hiding in "one word, one token":

- **The direction is backwards.** A token is *smaller* than a word on average, not equal to it, because rare words split into pieces. Every word-based estimate is an underestimate, by about a third for English and by three or four times for Hindi or Chinese.
- **The output was never budgeted.** The context window has to hold the prompt *and* the reply. Filling it with input leaves nothing to generate into.

The habit that prevents both: **estimate in characters, divide by 4 (or 3 for code, 1.5 for Devanagari or CJK), reserve room for the reply, and before you commit to a price, run the model's actual tokenizer over a sample of real traffic.** The rules of thumb are for sizing a decision. They are not for signing a contract.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Work these with pen and paper before reading the solutions in the next section.

1. Corpus: **low** 5 times, **lower** 2 times, **newest** 6 times, **widest** 3 times. Split into characters and find the first merge. Give the winning pair and its count.
2. Using the trained tokenizer from the code above, whose merge list is \`u+g\`, \`u+n\`, \`h+ug\`, in that order, encode the word "hugsun". How many tokens?
3. Someone sorts the merge list alphabetically before saving it, so it becomes \`h+ug\`, \`u+g\`, \`u+n\`. Encode "hug" with the sorted list. What comes out, and why is this a serious bug?
4. A document is 12,000 characters of English prose. A second document is the same content translated into Hindi, 11,000 characters. Estimate tokens for each, and state which one might not fit in a 4,096-token window.
5. A vocabulary starts from 256 bytes and you run 49,744 merges. What is the final vocabulary size, and why is that arithmetic exact?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `**1.** Split them: \`l o w\`, \`l o w e r\`, \`n e w e s t\`, \`w i d e s t\`. Count adjacent pairs weighted by word frequency. \`l o\` appears in low (5) and lower (2) = 7. \`o w\` likewise = 7. \`w e\` appears in lower (2) and newest (6) = 8. \`e s\` appears in newest (6) and widest (3) = 9. \`s t\` appears in newest (6) and widest (3) = 9. \`e r\` = 2, \`n e\` = 6, \`e w\` = 6, \`w i\` = 3, \`i d\` = 3, \`d e\` = 3. The top count is 9, and two pairs tie on it: \`e s\` and \`s t\`. A real implementation breaks the tie by whichever it encountered first. **Answer: \`e s\` or \`s t\`, count 9** — and noticing the tie is the point of the question.

**2.** Start from characters: \`h u g s u n\`. Apply \`u+g\`: \`h ug s u n\`. Apply \`u+n\`: \`h ug s un\`. Apply \`h+ug\`: \`hug s un\`. **Three tokens: hug, s, un.** Note that "hugsun" never appeared in training and still tokenized fine — that is subword tokenization doing its job.

**3.** With the sorted list, \`h+ug\` is applied first — but at that moment the word is still \`h u g\` and the symbol \`ug\` does not exist yet, so the rule matches nothing. Then \`u+g\` gives \`h ug\`, then \`u+n\` matches nothing. Output: **two tokens, \`h\` and \`ug\`**, instead of the one token \`hug\`. The bug is serious because it does not crash. The model receives ids it was never trained on, and produces fluent, grammatical, wrong output with no error anywhere. **The merge list is ordered. Never sort it.**

**4.** English at 4 characters per token: 12,000 / 4 = **3,000 tokens**, which fits in 4,096 with about 1,000 to spare. Hindi at roughly 1.5 characters per token: 11,000 / 1.5 = **7,333 tokens**, which does not fit — it overflows a 4,096 window by nearly double, despite being the shorter document by character count. This is the whole reason context windows must be quoted in tokens.

**5.** 256 + 49,744 = **50,000**. It is exact because each merge adds exactly one new symbol to the vocabulary and never removes one. That is also the answer to "how do I get a vocabulary of exactly size V?" — start with your base symbols and run V minus base merges. (Real vocabularies add a handful of special tokens on top, which is why published sizes are often odd numbers like 50,257.)`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section names things you will meet later so the words are not new when you get there.

- **WordPiece** (used by BERT) runs the same merge loop as BPE but picks the pair that most improves how well the vocabulary explains the corpus, rather than the raw count — informally it prefers gluing pieces that are rare on their own but common together. Continuation pieces are written with a \`##\` prefix.
- **Unigram** (used by T5) works in the opposite direction: start from a large candidate vocabulary and repeatedly delete the pieces whose removal costs the least. Because it keeps a probability for each piece, it can score several different splits of the same word, which allows sampling different splits during training as a form of data augmentation.
- **SentencePiece** is not a third algorithm. It is the library and file format that wraps BPE or Unigram and adds the genuinely important part: it treats the space as an ordinary character, so it needs no language-specific pre-processing and works on Japanese or Thai, which are written without spaces. Decoding becomes exact string joining, with nothing lost.
- **The vocabulary-size trade-off, in parameters.** The embedding table is V rows by d numbers per row. For GPT-2 small, V = 50,257 and d = 768, so the table is 38.6 million numbers — about 31% of that model's 124 million total. For Llama-3-8B, V = 128,256 and d = 4,096, giving 525 million per table. A bigger vocabulary means shorter sequences, and processing cost grows with the square of sequence length, so the saving is real. But the table itself grows in a straight line. Modern models have pushed V upwards mostly to serve more languages, not to save compute.
- **The trailing-space trap.** In GPT-family tokenizers a leading space belongs to the token, so \` Paris\` and \`Paris\` are two different ids. A prompt ending "Answer:" is healthy — the model emits \` Paris\` naturally. A prompt ending "Answer: " with a trailing space is not: you have already spent the space, so the model must now produce a token that starts mid-word, a shape it rarely saw in training. Output quality drops for a reason that is invisible in the text. Never end a prompt with whitespace you did not mean.
- **Tokenizer and model must match exactly.** Loading a different tokenizer than the one the weights were trained with maps text to ids the model never learned. It does not error; it produces fluent nonsense. The same applies to adding special tokens without resizing the embedding table.`,
    },
  ],
  quiz: [
    {
      question: 'Why is one number per word rejected as a tokenization scheme?',
      options: [
        { text: 'The sequences it produces are far too long', explanation: 'Word-level gives the SHORTEST sequences of the three options. Length is the problem with one number per character.' },
        {
          text: 'The list of words must be fixed in advance, so anything unseen — a typo, a name, new slang — has no number and its content is lost',
          explanation: 'Correct. That is the fatal one. The 200,000-plus vocabulary size is a real cost too, but a large table is survivable; permanently destroying the content of every unseen word is not.',
        },
        { text: 'Words carry too little meaning to be useful units', explanation: 'Backwards — a word carries a lot of meaning. It is a single character that carries almost none.' },
      ],
      correct: 1,
    },
    {
      question: 'In the hand-worked corpus, merge 1 glued u+g, which had been seen 20 times. The corpus went from 113 tokens to 93, and the vocabulary from 7 symbols to 8. Why exactly those numbers?',
      options: [
        {
          text: 'Each of the 20 places the pair occurred turned two tokens into one, saving 20 tokens; and one merge always adds exactly one new symbol',
          explanation: 'Correct, and both halves generalise: total tokens drop by the merged pair\'s count, and vocabulary size is always base symbols plus number of merges.',
        },
        { text: 'Coincidence of this particular corpus; the relationship does not hold in general', explanation: 'It holds always. Merging replaces two adjacent tokens with one, once per occurrence, and adds one vocabulary entry.' },
        { text: 'The 20 came from the number of distinct words, and the vocabulary grew because "hug" was added', explanation: 'There are only five distinct words. The 20 is the frequency-weighted count of the pair u+g, and the symbol added was \'ug\', not \'hug\'.' },
      ],
      correct: 0,
    },
    {
      question: 'You have finished training BPE. To tokenize a sentence it has never seen, what do you do?',
      options: [
        {
          text: 'Split it into characters and replay the learned merges, in the order they were learned',
          explanation: 'Correct. Encoding is deterministic replay with no counting and no search. The ordered merge list is the entire trained tokenizer.',
        },
        { text: 'Run the counting-and-merging loop again on the new sentence', explanation: 'That would invent new merges and produce ids the model has never seen. Training happens once, offline.' },
        { text: 'Look each word up in a dictionary of known words', explanation: 'That is word-level tokenization, and it brings back the unseen-word problem that subword tokenization exists to remove.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does starting from the 256 byte values instead of from characters guarantee that nothing is ever unrepresentable?',
      options: [
        { text: 'Because 256 is a much bigger starting vocabulary than the number of English letters', explanation: 'Size alone guarantees nothing — a 200,000-word vocabulary still misses the 200,001st word. The guarantee comes from coverage being total, not large.' },
        {
          text: 'Because every possible piece of text is already stored as a sequence of bytes, so every input is built from symbols the vocabulary already contains',
          explanation: 'Correct, and it is a guarantee by construction. The price is that non-English characters take 2 to 4 bytes each, so an under-represented language starts life shattered and stays expensive.',
        },
        { text: 'Because the tokenizer falls back to an "unknown" token gracefully', explanation: 'The opposite — the point is that no unknown token needs to exist at all.' },
      ],
      correct: 1,
    },
    {
      question: 'An LLM insists "strawberry" has two r\'s. What is the real cause?',
      options: [
        {
          text: 'The model never receives the letters — it receives a few token ids, so the spelling information is genuinely absent from its input',
          explanation: 'Correct. When it answers correctly it is recalling what training text said about the word, not inspecting it. Same cause as failures at reversal, rhyming and syllable counting. The fix is a tool call, not a better prompt.',
        },
        { text: 'The model was undertrained; more data would fix it', explanation: 'More data teaches more memorised spelling facts, but the characters still never enter the model\'s input.' },
        { text: 'Its randomness setting is too high', explanation: 'Sampling settings change which token gets picked from a set of options. They cannot add information that was never in the input.' },
      ],
      correct: 0,
    },
    {
      question: 'You need to fit a 12,000-character English document into an 8,000-token context window alongside a 2,000-character prompt, and leave room for a 2,000-character reply. Does it fit?',
      options: [
        { text: 'No — 14,000 characters is well over the 8,000 limit', explanation: 'The window is counted in tokens, not characters. Comparing a character count to a token limit is the mistake this module exists to prevent.' },
        {
          text: 'Yes — about 3,000 + 500 tokens of input and 500 of output, roughly 4,000 tokens, comfortably inside 8,000',
          explanation: 'Correct. At 4 characters per token: 12,000/4 = 3,000, 2,000/4 = 500, reply 2,000/4 = 500. Note that the reply must be budgeted inside the same window — that is the half people forget.',
        },
        { text: 'Yes, and the reply does not count because it is generated separately', explanation: 'The reply is generated into the same window and consumes the same budget. Filling the window with input leaves nothing to generate into.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain BPE to someone who has never seen it, and tell me what the trained artifact actually is.',
      answer:
        'Split every word in a large corpus into characters, so the starting vocabulary is just the distinct characters. Count every adjacent pair of symbols, weighting each word by how often it appears. Take the single most frequent pair, glue it into one new symbol everywhere it occurs, add that symbol to the vocabulary, then recount — recounting matters, because merging changes which pairs exist, and that is how merges stack into long tokens. Repeat N times; the vocabulary ends at base symbols plus N. The trained artifact is the ordered list of merges plus the resulting vocabulary. That is the whole tokenizer, and it is a text file. Encoding new text is not a search: split into characters and replay the same merges in the same order. The order is load-bearing — sorting the list silently produces a different tokenizer.',
      isCaseBased: false,
    },
    {
      question: 'Compare character-level, word-level and subword tokenization. Give me the trade-off axis, not a list.',
      answer:
        'The axis is vocabulary size against sequence length against meaning per token. Character-level: about a hundred entries, nothing is ever unrepresentable, but sequences are four to five times longer, and since processing cost grows with the square of sequence length that is roughly sixteen to twenty-five times more attention compute — plus each token carries so little meaning that the model burns capacity relearning that t-h-e is "the". Word-level: shortest sequences and the most meaning per token, but a 200,000-plus vocabulary, no sharing between "run" and "running", and a hard cliff where anything unseen becomes an unknown token and its content is destroyed. Subword sits in the middle deliberately: 30,000 to 200,000 entries, frequent words stay whole, rare words decompose into reusable pieces, and once you start from bytes nothing is unrepresentable. It is not a compromise that loses at both ends; it is the only option where both other failure modes disappear.',
      isCaseBased: false,
    },
    {
      question: 'What is byte-level BPE and why did GPT-2 adopt it?',
      answer:
        'Instead of starting from characters, start from the 256 possible byte values and run the identical loop on byte sequences. Since all text is bytes underneath, every conceivable input is representable and no unknown token needs to exist. That matters for web-scale training data full of emoji, every language, and corrupted text. The cost is that non-ASCII characters occupy several bytes each — two for an accented Latin letter, three for a CJK or Devanagari character, four for an emoji — so if the training corpus was thin in a language, BPE never learned merges for those byte runs and that language tokenizes near the byte level and is expensive forever. One implementation nuance: GPT-2 maps bytes through a reversible byte-to-printable-character table so whitespace and control bytes get visible stand-ins, which keeps the merge machinery text-based and decoding exactly lossless.',
      isCaseBased: false,
    },
    {
      question: 'Why do LLMs fail at counting letters, reversing strings and rhyming? Is more scale the fix?',
      answer:
        'Because the character information never enters the model. "strawberry" arrives as a handful of token ids — reportedly str, aw, berry for GPT-4 — and an integer does not expose its spelling. When the model answers correctly it is recalling what training text said about the word, not inspecting it, which is precisely why it is confidently wrong on unusual words. Scale helps only in that memorised sense; it does not put characters into the input. Genuinely related failures: reversal, syllable counting, pig latin, acrostics, "words starting with q". Arithmetic is adjacent but distinct — number tokenization is inconsistent, so 1234 and 1235 can split at different boundaries and digits do not align by place value; several model families now split every digit into its own token to fix this, and it measurably helps. The production answer is a tool call: character work and arithmetic belong in code, not in weights.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RAG product works well in English, but users in India report worse answers and a 3x higher bill per query. Diagnose it.',
      answer:
        'First hypothesis is the tokenizer, because it explains both symptoms at once. Devanagari costs three bytes per character, and if the tokenizer was trained on an English-heavy corpus it never learned merges for those byte runs, so Hindi tokenizes near the byte level — three to four times the tokens for the same meaning. That directly triples cost. It also silently shrinks the effective context: your retriever\'s "top 8 chunks" now overflows the window, and a chunker configured for "500 tokens per chunk" is cutting Hindi sentences into a fraction of what it cuts in English, which wrecks retrieval quality. Verification first, theory second: run the real tokenizer over matched English and Hindi sentence pairs and compare counts. That is a five-minute measurement. Fixes, ranked: one, move to a model whose tokenizer has a large multilingual vocabulary — usually the single biggest win; two, define chunk sizes in tokens using that exact tokenizer, never in characters or words; three, re-tune retrieval top-k against the real token budget; four, only if you control training, extend the vocabulary and continue training — expensive, and it requires retraining the embedding rows. State the trade-off honestly: the first three are configuration changes, the fourth is a project.',
      isCaseBased: true,
    },
    {
      question: 'Case: you fine-tuned a model and the outputs are fluent but semantically garbage — grammatical sentences about nothing, and no errors anywhere. Where do you look?',
      answer:
        'Fluent but meaningless with zero errors points at a mismatch in id space, and the tokenizer is the first suspect. In order: one, are you using the exact tokenizer that shipped with the checkpoint? A different tokenizer maps text to ids the weights never learned — the model still emits confident, well-formed text because the generation machinery is intact, it is just reading a different language. Two, did you add special tokens or extend the vocabulary without resizing the embedding table, or resize it and leave the new rows random? Three, does your training data go through the same chat template as inference? If training saw raw text and serving applies role markers, the model never sees the structure it was aligned around. Four, check the start and end markers: a missing end token means generation never stops, a doubled start token shifts every position. Five, a sanity test that takes one minute — encode a sentence, decode it back, and assert the round trip is identical. The general lesson: tokenizer bugs do not crash, they degrade, which is exactly why they hide.',
      isCaseBased: true,
    },
    {
      question: 'Case: estimate the monthly LLM cost of a feature before any code is written, and tell me where tokenization will make you wrong.',
      answer:
        'Build a per-request estimate first: system prompt plus retrieved context plus user message as input, and the reply as output, priced separately because output usually costs several times more per token. Convert with characters divided by 4 for English prose, by 3 for code, by 1.5 for Devanagari or CJK, then multiply by requests per month. Where tokenization makes you wrong, worst first: one, forgetting that the system prompt and chat-template wrapper are re-sent every turn, and that in a multi-turn chat the entire history is re-sent, so cost grows with the square of conversation length rather than linearly — this is the one that blows budgets; two, assuming a non-English user base costs the same as English when it can be three times more; three, estimating retrieved chunks in words instead of tokens, which is where the volume actually sits; four, forgetting to budget output tokens inside the same context window. The discipline is: use the rule of thumb to size the decision, then run the real tokenizer over a sample of actual traffic before committing to a price. And name the mitigations — prompt caching for the repeated prefix, and trimming or summarising history.',
      isCaseBased: true,
    },
    {
      question: 'Someone proposes training a new model with a character-level tokenizer to avoid all these problems. Argue both sides.',
      answer:
        'For: nothing is ever unrepresentable, the vocabulary is about a hundred entries so the embedding table nearly vanishes, cost per character is genuinely uniform across languages instead of penalising Hindi and Thai, and the character tasks — spelling, reversal, rhyming, digit alignment for arithmetic — become natively solvable because the model actually sees letters. Against, and this is why nobody ships it: sequences get four to five times longer, and attention cost grows with the square of length, so the same document costs roughly sixteen to twenty-five times more compute; the effective context window shrinks by the same factor; and each token carries so little information that the model must spend layers reconstructing word identity before it can reason at all. The honest current position is that this is an active research direction — byte-level and tokenizer-free architectures with learned grouping exist and are improving — and the blocker is the quadratic cost of long sequences, so progress is coupled to progress in efficient attention rather than to tokenization itself.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why tokenize at all?', back: 'A network multiplies numbers, and a letter is not a number. Text must become a list of integers first. Token = one piece of the chopped-up text. Vocabulary = the fixed list of all possible tokens. Token id = a token\'s position in that list.' },
    { front: 'The three options, one line each', back: 'One number per character: tiny vocabulary, nothing unrepresentable, but 4-5x longer text and almost no meaning per token. One number per word: short text and rich tokens, but a 200k+ list and unseen words are destroyed. Subword: common words whole, rare words split — the one that won.' },
    { front: 'The BPE training loop', back: 'Split every word into characters, count adjacent pairs weighted by word frequency, glue the most frequent pair everywhere, recount, repeat N times. Vocabulary size = base symbols + N, exactly, because each merge adds one symbol.' },
    { front: 'What is the trained BPE artifact, and how is new text encoded?', back: 'The ORDERED merge list plus the vocabulary — a text file, nothing more. Encoding = split into characters and replay those merges in the same order. No counting, no search. Sorting the list produces a different tokenizer and fails silently.' },
    { front: 'Why start from bytes instead of characters?', back: 'All text is a sequence of bytes, so a base vocabulary of the 256 byte values makes every possible input representable and removes the unknown-token case entirely. Cost: non-English characters take 2-4 bytes each, so under-trained languages tokenize near the byte level and stay expensive.' },
    { front: 'Token count rules of thumb', back: 'English prose: ~4 characters per token, ~0.75 words per token, so 1,000 tokens is about 750 words. Code: ~3 characters per token. Devanagari or CJK: ~1.5. Context windows are counted in tokens, never words — and the reply shares the same budget.' },
    { front: 'Why LLMs cannot count the r\'s in "strawberry"', back: 'The model receives three token ids, never the letters, so the spelling information is absent from its input. It answers from what training text said about words, not by inspecting them. Same cause: reversal, rhyming, syllable counts, acrostics. Fix with a tool call, not a prompt.' },
    { front: 'What happens to a token id immediately after tokenization?', back: 'It is used as a row number into a learned table with one row per vocabulary entry. Lookup is a memory read, not a calculation, which is why the ids themselves can be arbitrary. The rows are learned by training, and that is where meaning lives. Taught fully in the DL module Embeddings: Meaning as Vectors.' },
  ],
  mindmapMarkdown: `- Tokenization: How Text Becomes Numbers
  - The problem
    - networks multiply numbers, letters are not numbers
    - text -> list of integers -> back to text
    - the tokenizer runs before the model
  - Three options
    - per character: ~100 vocab, nothing lost, but 4-5x longer, no meaning
    - per word: short + meaningful, but 200k list and unseen words destroyed
    - subword: common words whole, rare words split - the winner
  - The four words
    - token = one piece
    - vocabulary = fixed list of all tokens, size V
    - token id = position in that list
    - subword = a piece of a word
  - BPE, by hand
    - split into characters
    - count adjacent pairs, weighted by word frequency
    - merge the most frequent pair everywhere
    - recount, repeat
    - worked: ug (20), un (16), hug (15)
    - vocab 7 -> 10, tokens 113 -> 93 -> 77 -> 62
  - The artifact
    - the ORDERED merge list IS the tokenizer
    - encoding = replay merges in order
    - sorting the list = silent wrong output
  - Byte-level start
    - base vocab = 256 byte values
    - nothing unrepresentable, ever
    - non-English chars cost 2-4 bytes
    - namaste = 6 chars but 18 bytes
  - Tokens are not words
    - ~4 chars/token, ~0.75 words/token
    - code ~3, Devanagari/CJK ~1.5
    - context window is counted in tokens
    - the reply shares the same window
    - history is re-sent every turn
  - Failure modes
    - counting r's in strawberry: letters never arrive
    - reversing, rhyming, syllables, acrostics
    - digits split inconsistently -> weak arithmetic
    - fix with a tool, not a prompt
  - Special tokens
    - end, start, padding
    - chat roles rendered into reserved ids
    - wrapper tokens billed every turn
    - user-typed role markers = prompt injection
  - Beyond the basics
    - WordPiece, Unigram, SentencePiece
    - vocab size vs embedding table size
    - trailing space breaks the prompt
    - tokenizer must match the model exactly`,
}

export default m
