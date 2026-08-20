import type { Module } from '../types'

const m: Module = {
  id: 'genai-l3-rag',
  subjectId: 'genai',
  level: 3,
  title: 'RAG End to End: Retrieve, Rerank, Generate',
  whyItMatters:
    'A language model has never read your company handbook, your tickets, or your notes. It cannot answer a question about them, and no amount of extra training will reliably fix that. The trick that does work is embarrassingly simple: find the right paragraph and paste it into the prompt. This module builds that whole system from scratch in plain Python - a real document, real chunks, a real search, a real prompt - and then shows you the place where almost every one of these systems actually breaks.',
  assumes: [
    'You have seen a Python list, a for loop, an if statement, and a function with def',
    'You know what a Python string is, and that "abc".split() cuts a string into words',
    'You know what a square root is',
    'No machine learning background is needed. Every term used here is defined here.',
  ],
  estMinutes: 43,
  sections: [
    {
      type: 'intuition',
      title: 'The problem: it has never read your handbook',
      md: `Your company handbook contains one sentence: *"Customers may request a refund within 30 days of purchase."* A customer asks your chatbot how long they have to ask for a refund.

- The model was trained on public text scraped from the internet. Your handbook was not in it. It has genuinely never seen that sentence.
- It still answers. It says "14 days" in a confident, well-written sentence, because producing fluent text is the only thing it does.
- That is a **hallucination**: an answer that is fluent, plausible, and not supported by anything real. In this setting it means one specific thing - the model stated a fact it had no source for.
- The model has no way to tell you it was guessing. A guess and a fact come out looking identical.

So the model needs the sentence. There are only two ways to get a fact into a model: put it in the training data, or put it in the prompt.`,
    },
    {
      type: 'intuition',
      title: 'Why training it on your handbook is the wrong tool',
      md: `The obvious idea is to train the model further on your documents. This is called **fine-tuning** - continuing to train an existing model on extra data so its internal numbers shift. It is taught in *Fine-Tuning: Full FT, LoRA & QLoRA*. For facts, it is the wrong tool, for four practical reasons.

- **Facts change.** HR edits the handbook on Tuesday. Retraining the model every Tuesday is expensive and slow, and until it finishes the model is confidently wrong.
- **You cannot point at the source.** After training, the sentence is not stored anywhere you can look up. It is smeared across millions of internal numbers. The model cannot show you the page it came from.
- **You cannot restrict it per user.** Once a salary document is trained into the weights, every user gets it. There is no per-person switch.
- **It does not reliably stick.** Training changes behaviour - tone, format, the shape of an answer - much more reliably than it implants individual facts.

The rule to remember: **fine-tuning changes how the model behaves; putting text in the prompt changes what it knows.**`,
    },
    {
      type: 'intuition',
      title: 'The whole idea, in one sentence',
      md: `So put the sentence in the prompt. Instead of asking *"how long do I have to ask for a refund?"*, send this:

*Answer only from the passage below. Passage: "Customers may request a refund within 30 days of purchase." Question: how long do I have to ask for a refund?*

- Now the model is not remembering. It is **reading**. That is a much easier job, and one it is very good at.
- This is called **retrieval-augmented generation**, or **RAG**. Broken into its three words: *retrieval* means looking text up, *augmented* means the prompt is enlarged with what you found, *generation* means the model then writes the answer.
- An answer built only from supplied text is called **grounded** - every claim traces back to a passage you can point at. **Grounding** is the property; the passage is the ground.
- Because you know exactly which passage you pasted in, you can print its source next to the answer. That is a **citation**, and it is free - you already had the source when you did the lookup.

That is the entire concept. Everything else in this module is engineering to answer one question: *when the handbook is 40,000 pages instead of one sentence, how do you find the right paragraph?*`,
    },
    {
      type: 'intuition',
      title: 'Five stages, and the words for them',
      md: `Finding the right paragraph splits into five steps. Each gets a section and a runnable snippet below. The vocabulary first, so nothing arrives unexplained.

1. **Chunk.** Cut the documents into small pieces. Each piece is a **chunk**. The rule you pick for cutting - split on blank lines, split every 300 words, split on headings - is your **chunking strategy**. Letting consecutive chunks share a few words so a sentence is never cleanly severed is called **overlap**.
2. **Embed and index.** Turn each chunk into something searchable and store it. That store is the **index**.
3. **Retrieve.** When a question arrives, score every chunk against it and keep the best few. That is **retrieval**. The number you keep is **top-k** - if k is 5, you keep the five best-scoring chunks.
4. **Rerank.** Take those few candidates and re-score them with a slower, more careful method that fixes the fast method's mistakes. That is **reranking**.
5. **Generate.** Paste the survivors into the prompt with the question and let the model write the answer.

One more term you will hear used as an insult: **context stuffing** means skipping steps 3 and 4 and pasting in everything you have. It is what people try first, and the chunking section shows exactly why it fails.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 1: chunk a document by hand',
      code: `DOC = """Customers may request a refund within 30 days of purchase.
Refunds go back to the original payment card.

Standard shipping takes five to seven business days.
Express shipping costs twelve dollars per order."""

chunks = DOC.split("\\n\\n")               # "\\n" is a newline, so "\\n\\n" is a blank line
for i, c in enumerate(chunks):           # enumerate hands you (position, item) on each pass
    print(i, "->", c.replace("\\n", " ")) # replace the inner newline so each chunk prints on one line

# real output:
# 0 -> Customers may request a refund within 30 days of purchase. Refunds go back to the original payment card.
# 1 -> Standard shipping takes five to seven business days. Express shipping costs twelve dollars per order.`,
      annotations: {
        1: 'Triple quotes let one string run across several lines. This is our entire document: four sentences in two paragraphs.',
        2: 'The refund fact lives in the sentence above this one. Keep an eye on it - later a careless chunker cuts it in half.',
        4: 'Paragraph two starts here. The blank line above it is the only thing marking the boundary.',
        5: 'The closing triple quote sits at the end of the last line, so the string ends without a trailing newline.',
      },
    },
    {
      type: 'note',
      md: 'Two chunks came out, one per paragraph. That is a chunking strategy: split on the blank line. It is a real one - it respects how a human wrote the document, so a chunk is a complete thought. It is also fragile, because it assumes the document has blank lines in sensible places. A PDF converted to text often has them in nonsensical places instead.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 2: the index - six chunks and one question',
      code: `CHUNKS = [                                                        # our entire index
    "Customers may request a refund within 30 days of purchase.",  # c0 - the chunk that answers
    "Refunds go back to the original payment card.",               # c1 - about refunds, wrong fact
    "Standard shipping takes five to seven business days.",        # c2 - off topic
    "Express shipping costs twelve dollars per order.",            # c3 - off topic
    "Closing an account does not refund the unused days of a subscription.",  # c4 - a near miss
    "Our support team answers questions about refund rules, refund timing, purchase history, shipping days, dollars charged and account settings.",  # c5 - a grab bag
]                                                                  # a real index holds millions of these
QUERY = "how many days after purchase can I ask for a refund"      # what the customer typed
print(len(CHUNKS), "chunks in the index")                          # len() counts the items

# real output:
# 6 chunks in the index`,
      annotations: {
        6: 'c4 is the interesting one. It contains the words "refund" and "days" and answers a completely different question. Word matching will love it.',
        7: 'c5 is a support-page blurb that mentions everything and states nothing. Every real corpus has hundreds of these, and they poison naive search.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 3: turn text into the words worth matching on',
      code: `STOP = {"how", "many", "a", "an", "the", "of", "to", "i", "can", "is", "do", "for", "and"}

def content(text):                    # give it a string, get back the useful words
    out = []                          # start with an empty list to collect into
    for w in text.lower().split():    # lower() so "Refund" matches "refund"; split() cuts on spaces
        w = w.strip(".,")             # strip removes those characters from both ends: "purchase." -> "purchase"
        if w not in STOP:             # skip the words that appear in every sentence
            out.append(w)             # keep the rest
    return out                        # hand the caller a plain list of words

print("query words:", content(QUERY))
print("chunk 0    :", content(CHUNKS[0]))

# real output:
# query words: ['days', 'after', 'purchase', 'ask', 'refund']
# chunk 0    : ['customers', 'may', 'request', 'refund', 'within', '30', 'days', 'purchase']`,
      annotations: {
        1: 'Curly braces with no colons make a set - an unordered bag with no duplicates, built for one question: is this thing in here? These are called stopwords: words so common that matching on them is evidence of nothing.',
        11: 'The query keeps five words. Three of them - days, purchase, refund - also appear in chunk 0. That overlap is the entire search signal we are about to use.',
        12: 'CHUNKS[0] is the first chunk; Python counts from 0. Note "30" survives as a word - numbers are just characters here.',
      },
    },
    {
      type: 'intuition',
      title: 'What real systems use instead of word overlap',
      md: `Counting shared words is a real search method, and it is the honest thing to teach first because you can run it in your head. Production systems replace it with **embeddings**: each chunk is converted into a list of a few hundred numbers, positioned so that chunks about similar things end up numerically close together.

- The advantage is paraphrase. "How much VRAM do I need" shares no words with "GPU memory requirements", so word overlap scores it zero. Embeddings score it high.
- The database that stores those number-lists and finds the closest ones without checking all ten million is a **vector database**, and the trick it uses is **approximate nearest neighbour search** - close enough, hundreds of times faster.
- Both are taught in *Embeddings, Vector Databases & Semantic Search*. Nothing below depends on the details.
- What does not change is the shape: score every chunk, keep the top-k, rerank. Swapping word overlap for embeddings swaps the scoring function and nothing else.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 4: retrieve - score every chunk, keep the best',
      code: `q = content(QUERY)                    # compute the query words once, not once per chunk

def hits(chunk):                      # our stand-in for a similarity score
    n = 0                             # counter for matching words
    for w in content(chunk):          # walk the chunk word by word
        if w in q:                    # is this chunk word one of the query words?
            n += 1                    # yes - count it
    return n                      # hand back the number of matching words

scored = []
for i, c in enumerate(CHUNKS):        # score every single chunk in the index
    scored.append((hits(c), i))       # store (score, position); a tuple sorts by its first item
scored.sort(reverse=True)             # reverse=True means biggest score first
for s, i in scored:
    print(s, "c" + str(i), CHUNKS[i][:44])   # [:44] shows the first 44 characters only

# real output:
# 4 c5 Our support team answers questions about ref
# 3 c0 Customers may request a refund within 30 day
# 2 c4 Closing an account does not refund the unuse
# 1 c2 Standard shipping takes five to seven busine
# 0 c3 Express shipping costs twelve dollars per or
# 0 c1 Refunds go back to the original payment card`,
      annotations: {
        10: 'scored starts empty and collects one pair per chunk. Building a list of (score, thing) pairs and sorting it is the plainest ranking code there is.',
        14: 'for s, i in scored unpacks each pair into two names at once, so s is the score and i is the position.',
      },
    },
    {
      type: 'intuition',
      title: 'The winner is wrong, and why that is normal',
      md: `Read the output again. The top-scoring chunk is **c5**, the support blurb that answers nothing. The chunk that actually contains the answer, c0, came second.

- c5 scored 4 because it is long. It says "refund" twice, plus "purchase" and "days". Length alone bought it the win.
- c0 scored 3, and it is the answer.
- This is not a bug in the toy. It is the defining weakness of fast search: a fast scorer looks at *how many* words match, not at whether the chunk is genuinely *about* the question.

You could fix it by making the scorer smarter, but a smarter scorer is a slower scorer, and you must run it against every chunk in the index. Ten million chunks makes that impossible. So do both, in two stages:

- **Stage one, fast and crude:** score all ten million, keep 50. Mistakes are fine here. The only job is to not lose the right chunk.
- **Stage two, slow and careful:** score those 50 properly and keep 5. You can afford a hundred times more work per chunk, because there are two hundred thousand times fewer chunks.

That is reranking, and that is why two stages beat one. One fast stage is inaccurate. One slow stage is unaffordable. Two stages are both.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 5: rerank the survivors with a fussier score',
      code: `top3 = [i for s, i in scored[:3]]     # keep only the position from the top 3 pairs
print("top 3 after retrieval:", top3)   # positions, best first

def rerank(chunk):                                     # slow score - only ever runs on survivors
    shared = set(content(chunk)) & set(q)              # & keeps words that are in BOTH sets
    return len(shared) / (len(content(chunk)) ** 0.5)  # ** 0.5 is square root: the length penalty

for i in top3:                                         # only 3 chunks reach this loop
    print(round(rerank(CHUNKS[i]), 3), "c" + str(i), CHUNKS[i][:44])  # score, name, first 44 chars
best = max(top3, key=lambda i: rerank(CHUNKS[i]))      # pick the position with the highest rerank
print("best before rerank: c" + str(top3[0]))          # top3[0] is what fast search chose
print("best after  rerank: c" + str(best))             # and this is what careful scoring chose

# real output:
# top 3 after retrieval: [5, 0, 4]
# 0.707 c5 Our support team answers questions about ref
# 1.061 c0 Customers may request a refund within 30 day
# 0.707 c4 Closing an account does not refund the unuse
# best before rerank: c5
# best after  rerank: c0`,
      annotations: {
        1: 'A list comprehension: [expression for names in list] builds a new list in one line. Read it as "the i from every (s, i) pair in the first three". scored[:3] is a slice - the first three items.',
        5: 'Two changes at once, and both matter. set(...) collapses duplicates, so c5 saying "refund" twice now counts once. & is set intersection - the words present in the chunk AND in the query.',
        6: 'Dividing by the square root of the chunk length is the length penalty. A long chunk gets more chances to contain your words by accident, so its score is discounted - but by square root, not by length, or every one-word chunk would win.',
        10: 'max(list, key=f) compares items by f(item) instead of by the item itself. lambda i: ... is a one-line unnamed function: given i, return its rerank score.',
      },
    },
    {
      type: 'note',
      md: 'The reorder in that output is the whole reason reranking exists. c5 went from 0.707 to third place and c0 to first, from 3 hits to 1.061. Real systems use a **cross-encoder** for stage two: a model that reads the question and the chunk *together* in one pass, so it can tell "mentions refunds" from "answers this refund question". Our two rules - count each word once, penalise length - are a crude stand-in that produces the same kind of correction for the same reason.',
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Stage 6: assemble the prompt',
      code: `order = sorted(top3, key=lambda i: -rerank(CHUNKS[i]))   # the minus sign sorts high to low
lines = ["Answer only from the passages below. If they do not answer it, say I do not know."]
for rank, i in enumerate(order):                         # rank counts 0, 1, 2 as we go
    lines.append("[S" + str(rank + 1) + "] " + CHUNKS[i])  # label each passage S1, S2, S3
lines.append("Question: " + QUERY)                       # the question goes last
print("\\n".join(lines))                                  # join glues the list with newlines between

# real output:
# Answer only from the passages below. If they do not answer it, say I do not know.
# [S1] Customers may request a refund within 30 days of purchase.
# [S2] Our support team answers questions about refund rules, refund timing, purchase history, shipping days, dollars charged and account settings.
# [S3] Closing an account does not refund the unused days of a subscription.
# Question: how many days after purchase can I ask for a refund`,
      annotations: {
        1: 'sorted() returns a new sorted list rather than rearranging the original. Negating the score flips the order, because sorting is smallest-first by default.',
        2: 'The instruction is doing real work. Without "answer only from the passages", the model happily falls back on its own guesses, and you are back to the 14-days hallucination.',
        4: 'The S1/S2/S3 labels are what makes citation possible: you kept the mapping from label to chunk, so a label in the answer resolves to a document you can link.',
      },
    },
    {
      type: 'note',
      md: 'That prompt string is the whole output of the pipeline - it is what you would send to a language model. **Illustrative only, not a run:** no model was called anywhere in this module. Given that prompt, a working model should answer roughly *"30 days from the date of purchase [S1]."* If you ever see a claim about what a model replied, check whether someone actually ran it.',
    },
    {
      type: 'intuition',
      title: 'Chunking is where these systems actually fail',
      md: `The pipeline above is straightforward. The part that decides whether your system works is the one that looks like a formatting detail: how you cut the documents up.

The reason is a hard constraint worth memorising: **retrieval can never return anything smaller than a chunk, and never anything larger.** The chunk is the unit. If the answer is half a chunk, you get the other half too. If the answer spans two chunks, you get half an answer.

Three ways it goes wrong, all shown with real numbers next:

- **Chunks too small** - the answer gets scattered across several chunks and no single one is convincing.
- **Chunks too large** - the matching words are diluted by hundreds of unrelated words, so the score drops and the right chunk loses to a short irrelevant one.
- **A boundary lands mid-answer** - the worst case, because both halves score respectably and neither one answers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Failure 1: chunks too small',
      code: `POLICY = "Customers may request a refund within 30 days of purchase. Refunds go back to the original payment card."  # one paragraph of the handbook
w = POLICY.split()                    # a flat list of every word in the policy
for i in range(0, len(w), 3):         # range(start, stop, step) - so i is 0, 3, 6, 9 ...
    piece = " ".join(w[i:i + 3])      # w[i:i+3] takes three words; join glues them back into a string
    print(hits(piece), "|", piece)    # score each tiny chunk against the same query

# real output:
# 0 | Customers may request
# 1 | a refund within
# 1 | 30 days of
# 1 | purchase. Refunds go
# 0 | back to the
# 0 | original payment card.`,
      annotations: {
        5: 'The best score any chunk can now reach is 1, down from 3. The word "refund" is in one chunk, "30 days" is in the next, "purchase" is in the one after. The fact still exists in the corpus and has been shredded into three pieces that individually mean nothing.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Failure 2: chunks too large',
      code: `BIG = " ".join(CHUNKS)                # the opposite mistake: the whole document as ONE chunk
print("one big chunk:", hits(BIG), "hits,", len(content(BIG)), "words, rerank", round(rerank(BIG), 3))
print("c0 (the answer):", hits(CHUNKS[0]), "hits,", len(content(CHUNKS[0])), "words, rerank", round(rerank(CHUNKS[0]), 3))
print("c2 (off topic) :", hits(CHUNKS[2]), "hits,", len(content(CHUNKS[2])), "words, rerank", round(rerank(CHUNKS[2]), 3))

# real output:
# one big chunk: 10 hits, 54 words, rerank 0.408
# c0 (the answer): 3 hits, 8 words, rerank 1.061
# c2 (off topic) : 1 hits, 7 words, rerank 0.378`,
      annotations: {
        2: 'The big chunk has the most raw hits of anything in this module - 10 - and the second-worst rerank score, 0.408. That is dilution in one line: the matching words are real, and they are drowning in 54 words of other material.',
        3: 'c0 is the same eight-word chunk from stage 2, scored again for comparison. Three hits, and the best rerank score in this module.',
        4: 'The comparison that should worry you: the whole document scores 0.408 and the short, entirely off-topic shipping chunk scores 0.378. A dozen more shipping sentences in the file and the document containing your answer would lose to a chunk about parcels.',
      },
    },
    {
      type: 'intuition',
      title: 'So what size, and what do you do about it?',
      md: `The two failures pull in opposite directions, which is why there is no universally correct answer - only a defensible starting point and a way to check it.

- Start at roughly **200 to 500 words per chunk**: big enough to hold a complete fact with its context, small enough that a match means something.
- **Split on structure, not on a counter.** Cut at headings, paragraphs, list items, table rows. A rule that cuts every 300 words will eventually cut in the middle of a sentence, and eventually is every day at scale.
- **Add overlap.** Let each chunk repeat the last 10 to 20 percent of the previous one. A sentence severed by a boundary then survives whole inside its neighbour. It costs storage and buys back most boundary failures.
- **Prefix each chunk with its document title and heading.** A chunk reading only "Within 30 days." is useless alone; "Refund Policy > Timing: Within 30 days." is not.
- **Then measure it.** Write down 50 real questions and the paragraph that answers each, and count how often your top-5 contains the right paragraph. Change the chunk size, count again. That is the only honest way to pick, and it is the subject of *Evaluating LLM Systems: Judges, Hallucination & Guardrails*.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One question through the pipeline, then the way it breaks',
        notice: 'Step through it. Watch the candidate list shrink from 6 to 3 and reorder at the rerank step, then watch the last frame, where every stage runs correctly and the answer is still wrong.',
        leftLabel: 'query path',
        rightLabel: 'index / candidates',
        frames: [
          {
            note: '1. A question arrives. Nothing is retrieved yet - the index was built earlier, offline, by the chunking job.',
            stack: [{ name: 'query', value: '"how many days ... refund"' }],
            heap: [{ id: 'idx', value: '6 chunks (real: millions)', label: 'index' }],
          },
          {
            note: '2. Fast scoring runs over every chunk in the index. Here that is 6 comparisons; in a real system it is millions, which is why this stage must stay cheap.',
            stack: [{ name: 'q', value: "['days','after','purchase','ask','refund']", to: 'idx' }],
            heap: [{ id: 'idx', value: '6 chunks scored', label: 'index' }],
          },
          {
            note: '3. Top-3 kept. Note the order: the grab-bag c5 is FIRST with 4 hits, purely for being long. The right answer c0 is second. Fast search is allowed to be wrong here - it only has to keep the answer in the list.',
            stack: [{ name: 'top3', value: '[5, 0, 4]' }],
            heap: [
              { id: 'c5', value: 'support blurb, mentions everything', label: '4 hits' },
              { id: 'c0', value: 'refund within 30 days of purchase', label: '3 hits' },
              { id: 'c4', value: 'closing an account does not refund', label: '2 hits' },
            ],
          },
          {
            note: '4. Rerank: count each word once, divide by the square root of the length. c0 rises to 1.061 and c5 falls to 0.707. This one reorder is the entire reason a second stage exists.',
            stack: [{ name: 'best', value: 'c0', to: 'c0' }],
            heap: [
              { id: 'c0', value: 'refund within 30 days of purchase', label: 'rerank 1.061' },
              { id: 'c5', value: 'support blurb', label: 'rerank 0.707' },
              { id: 'c4', value: 'account closing', label: 'rerank 0.707' },
            ],
          },
          {
            note: '5. Prompt assembly. Strongest passage first, each labelled S1/S2/S3 so the answer can cite it, with an instruction to answer only from these passages.',
            stack: [
              { name: 'prompt[0]', value: 'answer only from the passages' },
              { name: 'prompt[1]', value: '[S1] ...', to: 'c0' },
              { name: 'prompt[4]', value: 'Question: how many days ...' },
            ],
            heap: [{ id: 'c0', value: 'refund within 30 days of purchase', label: 'S1 policy.md' }],
          },
          {
            note: 'FAILURE - the chunker cut mid-sentence. Chunk A holds "may request a refund within", chunk B holds "30 days of purchase". Both retrieve. Neither answers. Every stage after this ran perfectly and could not help.',
            stack: [
              { name: 'top3', value: '[B, A, ...]', danger: true },
              { name: 'answer', value: 'confident and wrong', danger: true },
            ],
            heap: [
              { id: 'A', value: '"Customers may request a refund within"', label: '1 hit', danger: true },
              { id: 'B', value: '"30 days of purchase. Refunds go"', label: '2 hits', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Worked case: one question, computed by hand',
      md: `No code. Take the six chunks and the query *"how many days after purchase can I ask for a refund"* and do it on paper.

1. **Query words after removing stopwords:** days, after, purchase, ask, refund. Five words.
2. **Score c0** - *"Customers may request a refund within 30 days of purchase."* Its content words are customers, may, request, refund, within, 30, days, purchase. Which are in the query list? refund, days, purchase. **Score 3.**
3. **Score c4** - *"Closing an account does not refund the unused days of a subscription."* Content words closing, account, does, not, refund, unused, days, subscription. Matches: refund, days. **Score 2.**
4. **Score c5** - the grab bag. It contains refund twice, plus purchase and days. **Score 4.** It wins retrieval while answering nothing.
5. **Top-3 is therefore c5, c0, c4.** The answer survived, in second place. That is retrieval doing its job - not being right, just not losing the answer.
6. **Rerank c5.** Distinct query words present: refund, purchase, days - three. It has 18 content words, and the square root of 18 is about 4.24. Score = 3 / 4.24 = **0.707**. The double "refund" stopped counting twice, and the length cost it.
7. **Rerank c0.** Distinct matches: refund, days, purchase - also three. But it has 8 content words, and the square root of 8 is about 2.83. Score = 3 / 2.83 = **1.061**.
8. **c0 wins**, goes into the prompt as S1, and the answer is 30 days with a citation.

The number to take away is the pair 0.707 against 1.061. Both chunks match the same three words. The only difference is that one of them is *about* the question and the other merely mentions it, and dividing by length is what turned that difference into a number.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake: the answer is in the corpus, cut in half',
      md: `Here is the failure that catches nearly everyone, and it looks like a success from the outside.

A team ships a policy assistant. Retrieval logs look healthy - every question returns chunks that mention refunds. Users report that the bot "sort of knows" the refund policy but never states the window. The team assumes the model is at fault, spends a week rewriting the prompt, and nothing improves.

The chunker was splitting every 6 words. Run it.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The diagnosis: print the chunks the query actually retrieved',
      code: `A = " ".join(w[:6])                   # first six words of the policy
B = " ".join(w[6:12])                 # the next six
print("A:", A)                        # read the chunk text, not just the score
print("B:", B)                        # this is the diagnostic step people skip
print("A ->", hits(A), "hits, rerank", round(rerank(A), 3))   # score chunk A as usual
print("B ->", hits(B), "hits, rerank", round(rerank(B), 3))   # and chunk B

# real output:
# A: Customers may request a refund within
# B: 30 days of purchase. Refunds go
# A -> 1 hits, rerank 0.447
# B -> 2 hits, rerank 0.894`,
      annotations: {
        1: 'w[:6] is a slice - items from the start up to but not including position 6. This is the chunker cutting blind: six words, no attention to where the sentence ends.',
        2: 'w[6:12] picks up exactly where A stopped. There is no overlap, so the words "refund within" and "30 days" never appear in the same chunk again.',
      },
    },
    {
      type: 'intuition',
      title: 'Why the week on the prompt was wasted',
      md: `Look at what the model was handed. B scores highest, so B goes into the prompt: *"30 days of purchase. Refunds go"*. Thirty days of what? The chunk does not say. A says a refund may be requested within - within what? A does not say.

- Both chunks retrieve, and both look plausible in a log. Nobody scrolls far enough to notice neither one is a complete fact.
- The model then does one of two things, and both get blamed on the model. It answers "I do not know" on a question your own handbook answers, or it fills the gap from its training data and confidently says 14 days.
- **No prompt fixes this.** The words "30 days" and "refund" were never in the same string the model saw. The prompt cannot recover text that was never sent.
- The diagnostic that would have saved the week is one line: *print the chunks you actually retrieved and read them as a human.* If they do not answer the question when you read them, the model has no chance either.

This is the general shape of nearly every RAG bug: the failure happened at retrieval or chunking, and it shows up as a generation problem. Always check the retrieved text before touching the prompt.

The fixes here, in order of how much they buy: **overlap** (if chunks had shared their last two words, "refund within 30 days" would exist somewhere intact), **splitting on sentence ends instead of a word counter**, and **returning the whole enclosing paragraph** whenever a small chunk matches.`,
    },
    {
      type: 'intuition',
      title: 'When RAG is the wrong answer',
      md: `RAG supplies facts. If the thing missing is not facts, it will not help, and reaching for it anyway is a common and expensive mistake.

- **The task needs reasoning, not lookup.** "Given these 40 tickets, what is our biggest recurring problem?" No single passage contains that answer. Retrieval hands over 5 tickets out of 40 and the model summarises those. You needed to process all of them, not search them.
- **The task needs a behaviour change.** The model is too chatty, ignores your JSON format, or will not stop apologising. No retrieved passage fixes a habit. That is fine-tuning, or a much firmer prompt.
- **The task needs a computation.** "What was total revenue last quarter?" belongs in a SQL query, not a similarity search. Retrieval finds documents that talk about revenue; it does not add up numbers.
- **The corpus is tiny.** If your whole knowledge base is 20 pages, paste all 20 pages into the prompt. Do not build a pipeline to search a document that fits in the prompt.
- **The facts never change and are public.** A good model already knows what HTTP 404 means. Retrieving a definition it has known since pretraining adds latency and no accuracy.

The honest test: *ask what would have to change for the answer to change.* If it is a document, RAG. If it is a habit, fine-tuning. If it is a number in a database, write a query.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Do these on paper before reading the solutions in the next section. Stopwords are the same set used above: how, many, a, an, the, of, to, i, can, is, do, for, and.

1. Query: *"how much does express shipping cost"*. Using the six chunks in stage 2, list the query content words, score c2 and c3 by counting matching words, and say which one retrieval ranks first.
2. Chunk c3 is "Express shipping costs twelve dollars per order." Its rerank score for the query in problem 1 is 2 divided by the square root of 7 - it has 7 content words. Compute it, then compute the rerank score of c5 (18 content words) for the same query, and say whether reranking changes the winner.
3. Your chunker splits every 100 words. A support article has 40 questions, each a heading with a two-sentence answer under it. Name two distinct failures you should expect, and one chunking strategy that avoids both.
4. A user asks "what is our refund policy?" and gets a correct, well-written answer that cites a page deleted from the wiki three months ago. Which stage is broken, and what would you add to the pipeline?
5. Retrieval returns the right chunk in the top-5 for 60 of 100 test questions. Your generation step is flawless. What is the highest end-to-end accuracy you can possibly reach, and what does that tell you about where to spend the next week?`,
    },
    {
      type: 'intuition',
      title: 'Practice solutions',
      md: `1. Content words: much, does, express, shipping, cost. c2 is "Standard shipping takes five to seven business days" - content words standard, shipping, takes, five, seven, business, days; only **shipping** matches, so **score 1**. c3 is "Express shipping costs twelve dollars per order" - content words express, shipping, costs, twelve, dollars, per, order. **express** and **shipping** match; "costs" does not match "cost" because we compare whole words. **Score 2**, so c3 ranks first. Retrieval got it right this time, and note the near-miss: plural "costs" against singular "cost" is a real class of bug that word matching has and embeddings do not.
2. c3: 2 divided by the square root of 7 is 2 / 2.646 = **0.756**. Does c5 match express? No - c5 says shipping but not express, so it has 1 distinct match, and 1 / 4.243 = **0.236**. Reranking does not change the winner here; it widens the gap. That is the normal case. Reranking earns its keep on the minority of queries where it flips the order, and you cannot know in advance which ones those are.
3. Two failures: (a) a 100-word cut lands in the middle of an answer, so a question ends up in one chunk and half its answer in the next - the boundary split; (b) a 100-word chunk can swallow three unrelated question-and-answer pairs, so a match on one drags in two irrelevant ones and dilutes the score. The strategy that avoids both: **split on the headings**, one chunk per question-and-answer pair, and prefix each chunk with the article title. The document already told you where the boundaries are.
4. Nothing in retrieval or generation is broken - the pipeline faithfully returned what was in the index. The **index is stale**: the document was deleted from the wiki and never deleted from the index. Add an ingestion job that re-syncs on a schedule and removes chunks whose source is gone, and store the source date on every chunk so you can prefer recent material. This failure is invisible in every metric that only looks at the answer quality, which is what makes it dangerous.
5. **60 percent.** If the right chunk is missing from the prompt in 40 of 100 cases, a perfect model still cannot answer those 40 - it cannot cite what it never received. Retrieval accuracy is a hard ceiling on end-to-end accuracy. So the next week goes into chunking and retrieval, not into the prompt. This one number is why you always measure the two halves separately instead of reporting a single score.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above is enough to build a working system and explain it. These are the four things you meet next.

- **Hybrid search.** Run word matching and embedding search side by side and merge the two ranked lists. Embeddings miss exact rare tokens - an error code like ERR_2231, a product SKU, a surname - because they never learned a good position for them. Word matching catches those and misses paraphrase. Together they cover each other, and merging costs almost nothing.
- **Query rewriting.** In a chat, the third message is "and how much does that cost?". Searching for those words retrieves nothing useful, because the subject is in an earlier message. So use the model to rewrite the follow-up into a standalone question first - "how much does express shipping cost?" - and search with that. In any multi-turn assistant this is close to mandatory.
- **Permissions.** Store an access tag on every chunk at indexing time, and put the permission check *inside* the search query so a forbidden chunk is never scored. Filtering after retrieval is not equivalent: by then the document is already loaded in your process, ready to be logged, cached, or leaked by the next bug. If you cache answers, the cache key must include who is asking, or user B gets user A's private answer.
- **Lost in the middle.** Models pay most attention to the start and end of a long prompt and least to the middle. A correct passage sitting twelfth of twenty can be effectively invisible. Send fewer passages, and put the strongest first.`,
    },
  ],
  quiz: [
    {
      question: 'Your assistant answers a refund question wrongly. The logs show the paragraph containing the correct answer was not among the retrieved top-5. What is the most direct fix?',
      options: [
        { text: 'Rewrite the prompt to insist harder on using the provided context', explanation: 'The prompt cannot help. The correct text was never sent to the model, so there is nothing in the context to insist on.' },
        { text: 'Fix retrieval: chunking, the scoring method, or a larger k before reranking', explanation: 'Correct. This is a retrieval miss, and retrieval accuracy is a hard ceiling on the final answer. Nothing downstream can recover a passage that was never fetched.' },
        { text: 'Use a larger language model', explanation: 'A bigger model reading the wrong passages still answers wrongly, just more fluently.' },
        { text: 'Fine-tune the model on the handbook', explanation: 'That reintroduces every problem RAG was chosen to avoid: no citation, no per-user scoping, and stale the next time the handbook changes.' },
      ],
      correct: 1,
    },
    {
      question: 'Why run a fast crude search first and a slow careful one second, instead of just running the careful one?',
      options: [
        { text: 'The careful method is less accurate on large collections', explanation: 'Accuracy is not the issue. The careful method is more accurate; it is the cost that rules it out at scale.' },
        { text: 'The two methods measure different things, so both scores are needed', explanation: 'They measure the same thing - relevance to the query - with different amounts of care.' },
        { text: 'The careful method is too slow to run against every chunk, but affordable on the 50 the fast one keeps', explanation: 'Correct. Fast-and-wide narrows millions to 50; slow-and-narrow gets those 50 into the right order. One fast stage is inaccurate, one slow stage is unaffordable, two stages are neither.' },
        { text: 'It halves the number of chunks stored in the index', explanation: 'Reranking happens at query time and changes nothing about what is stored.' },
      ],
      correct: 2,
    },
    {
      question: 'In the module, the long grab-bag chunk c5 scored 4 hits and beat the correct chunk c0 at 3. After reranking, c0 scored 1.061 and c5 scored 0.707. Which two changes caused the flip?',
      options: [
        { text: 'Counting each distinct word once, and dividing by the square root of the chunk length', explanation: 'Correct. Counting distinct words stopped c5 scoring twice for saying "refund" twice, and the length penalty discounted it for being long. Both chunks matched the same three words; only length separated them.' },
        { text: 'Removing stopwords from the chunks', explanation: 'Stopwords were removed at both stages, so they cannot explain a change between them.' },
        { text: 'Sorting the results in the opposite direction', explanation: 'The sort direction was descending in both stages. Reversing it would put the worst chunk first.' },
        { text: 'Using a larger k so more candidates were compared', explanation: 'k stayed at 3. Reranking reordered the same candidates rather than adding any.' },
      ],
      correct: 0,
    },
    {
      question: 'A chunker splits every 6 words. The handbook says "Customers may request a refund within 30 days of purchase." Both resulting chunks retrieve for a refund question. Why does no prompt change fix the wrong answers?',
      options: [
        { text: 'The chunks are too short for the model to read reliably', explanation: 'Short text is not hard for a model to read. The problem is that the fact itself was cut, not the length.' },
        { text: 'The word "refund" and the words "30 days" are in different chunks, so no single passage states the fact', explanation: 'Correct. One chunk says a refund may be requested within, the other says 30 days of purchase. Neither is a complete fact, and a prompt cannot recover text that was never sent.' },
        { text: 'The model attends least to the middle of the prompt', explanation: 'A real effect and a different one. Here the information is not buried in the middle; it is missing from every passage.' },
        { text: 'Six-word chunks embed poorly', explanation: 'This example uses word matching, not embeddings, and the failure appears with either.' },
      ],
      correct: 1,
    },
    {
      question: 'You need answers that reflect a policy document HR edits weekly, and every answer must link to the clause it used. RAG or fine-tuning?',
      options: [
        { text: 'Fine-tune weekly on the new policy', explanation: 'Weekly retraining is expensive and slow, and it still cannot produce a link to a clause. The requirement to cite is what rules it out on its own.' },
        { text: 'RAG - the facts change and must be citable, which is exactly what putting text in the prompt gives you', explanation: 'Correct. Changing facts and required citations are two properties that trained-in weights cannot provide. Fine-tuning could be added later for tone or format, never for the facts.' },
        { text: 'Neither - a larger base model will know the policy', explanation: 'No base model has ever seen your internal policy, and none can link to it.' },
        { text: 'Fine-tune once, then patch with prompts when the policy changes', explanation: 'The moment the policy changes the weights are wrong, and patching a changing document by hand does not scale.' },
      ],
      correct: 1,
    },
    {
      question: 'Your top-5 contains the correct paragraph for 60 of 100 test questions. What is the maximum end-to-end accuracy achievable, even with a perfect generator?',
      options: [
        { text: '100% - a good model can infer the rest', explanation: 'Inferring facts it was not given is exactly the hallucination the pipeline exists to prevent.' },
        { text: '80% - roughly halfway, since the model gets partial credit', explanation: 'There is no partial credit here. If the passage is missing, the answer is not grounded in anything.' },
        { text: '60% - retrieval accuracy is a hard ceiling on the final answer', explanation: 'Correct. In the 40 failing cases the answer was never in the prompt, so no generator can produce it with a source. Spend the next week on chunking and retrieval, not on the prompt.' },
        { text: 'It cannot be determined without knowing the model', explanation: 'It can, and that is the point of measuring retrieval separately: the ceiling is a property of retrieval alone.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain RAG end to end to an engineer who has never built one.',
      answer:
        'Two halves sharing one index. Offline: load the documents, cut them into chunks of a few hundred words along headings and paragraphs, convert each chunk into a searchable form, and store it with its source, date and access tag. Online, per question: score the chunks against the question and keep the best ~50, rerank those to ~5 with a slower and more careful scorer, paste the survivors into the prompt with labels and an instruction to answer only from them, then generate and return the sources. Say why it exists: the model never saw your private documents, and training them in gives you no citation, no per-user access control, and stale facts. And name the constraint that matters most: end-to-end accuracy is capped by retrieval accuracy.',
      isCaseBased: false,
    },
    {
      question: 'Case: a fintech wants a support assistant. Their product docs change monthly, they have 40k internal pages, answers must cite a source, and different customer tiers may see different documents. RAG, fine-tuning, or both?',
      answer:
        'RAG for the knowledge, fine-tuning later at most for behaviour. Each requirement independently rules out putting the facts into the weights: monthly changes would mean monthly retraining; 40k pages is a search problem, not a memorisation one; a citation needs a document you can point at, which trained-in facts are not; and per-tier visibility needs a filter applied per user at query time, which weights cannot express. So build RAG with the tier tag stored on every chunk and the tier check applied inside the search itself, not after it. Where fine-tuning could still earn its place: a small model tuned to answer in the house format and to refuse cleanly, which shortens prompts and cuts cost per question - but only after the RAG baseline is measured, and never for the facts. The rule to state out loud: fine-tuning changes how the model behaves, RAG changes what it knows, and if the right answer changes when a document changes, it is RAG.',
      isCaseBased: true,
    },
    {
      question: 'Design a strategy to stop a production RAG assistant from hallucinating. Be concrete about the layers and what each costs.',
      answer:
        'Layer it, cheapest first. (1) Fix retrieval, because most so-called hallucinations are retrieval misses: better chunking on structure with overlap, hybrid word-plus-embedding search, a reranker, and query rewriting for follow-up questions. Costs some latency, buys the largest single improvement. (2) Prompt discipline: passages clearly delimited and labelled, an explicit instruction to answer only from them and to say "I do not know" otherwise, strongest passage first. Free. (3) Abstain on weak evidence: if the best reranker score falls below a threshold, return the closest documents instead of an answer. Costs coverage, and the threshold must be tuned against a test set. (4) Enforce citations: require a source label on each claim and reject an answer whose labels do not resolve to a passage you sent. Cheap and very visible to users. (5) Sample-check groundedness offline with a second model as a judge - too expensive to run on every request, fine on a sample and on the full test set in CI. (6) Feed failures back: log the question, the retrieved chunk ids and the answer, and turn every thumbs-down into a permanent test case. Close on the tradeoff: every strictness knob trades hallucination against refusing questions you could have answered, so measure the refusal rate as a first-class number, not as a bug.',
      isCaseBased: true,
    },
    {
      question: 'How would you choose a chunk size, and what would you do about an answer that spans a chunk boundary?',
      answer:
        'Not in the abstract - against a test set. Write 50 real questions with the paragraph that answers each, then measure how often the right paragraph is in the top-5 for two or three candidate configurations. Starting point: 200 to 500 words, split on structure - headings, paragraphs, table rows - rather than on a word counter, because the chunk is the smallest thing retrieval can ever return. For boundary splits, overlap of 10 to 20 percent helps, and returning the enclosing section whenever a small chunk matches helps more: you get precision when matching and completeness when reading. Also prefix every chunk with its document title and heading path, so an orphaned chunk still says what it is about. State the tradeoff plainly: small chunks match precisely and answer partially, large chunks answer completely and match fuzzily.',
      isCaseBased: false,
    },
    {
      question: 'Your assistant scores 68% on answer correctness. What do you measure next, and why not just improve the prompt?',
      answer:
        'Split the number, because one score does not name a fix. Measure retrieval on its own: how often is the correct paragraph in the top-k, and how highly does it rank. Then measure generation on its own, with the correct passage guaranteed present: is every claim in the answer supported by the passages, and does the answer address the question. The diagnosis is then mechanical. Low retrieval with good generation means fix parsing, chunking and search. Good retrieval with poor generation means fix the prompt, the passage order, or the model. Retrieval is a hard ceiling - at 70% you cannot exceed 70% however good the prompt is - so improving the prompt first is the classic wasted month.',
      isCaseBased: false,
    },
    {
      question: 'Case: users say the assistant works on short documents but fails on a 200-page policy PDF. Walk through your debugging.',
      answer:
        'Work the pipeline in order and stop at the first broken stage. (1) Read the extracted text. Multi-column PDF layouts interleave columns into nonsense, tables collapse into word soup, and a page header repeats into every chunk. This is the most likely culprit and the one people skip. (2) Print the chunks for a failing question and read them as a human. Is the answer split across a boundary? Is a table row separated from its header row? If the retrieved text does not answer the question when you read it, stop - the bug is here. (3) Measure retrieval on your test questions. If the right chunk exists but does not rank, add word matching alongside embeddings, because long policy documents are full of exact terms like clause numbers that embeddings handle badly. (4) If the right chunk does rank and the answer is still wrong, look at how many passages you are sending and in what order: with a big document you are probably sending more, so dilution and the lost-in-the-middle effect are live. Send fewer, reorder strongest first. (5) Fix in that order - parser, chunker, search, ordering. On a large PDF it is the parser nine times out of ten, and no amount of prompt work will show it to you.',
      isCaseBased: true,
    },
    {
      question: 'Case: design the serving side of a RAG assistant at 500 requests per minute with a 2-second p95 latency target and a fixed budget. What do you build, and what do you cut first?',
      answer:
        'Two deployables. Ingestion is a scheduled batch job, incremental and idempotent, so one edited page re-processes one page, writing into a versioned index. The query service is stateless and autoscaled. Budget the path roughly: turn the question into a vector ~20 ms, search the index ~30 ms, rerank 50 candidates ~150 ms, first token ~500 ms. That fits 2 seconds with headroom, and users perceive time-to-first-token because the answer streams. Put a cache in front keyed on the question, the asking user\'s permission scope, and the index version - support traffic repeats heavily, and a 30% hit rate removes 30% of both latency and cost. Cost per question is dominated by the passage tokens you paste in, so sending 5 chunks rather than 50 is a budget decision as much as an accuracy one. Under pressure I would cut rerank depth first, from 50 candidates to 25, then drop the offline groundedness check to a small sample. What I would never cut: the permission filter and the citations. Both are correctness, not polish.',
      isCaseBased: true,
    },
    {
      question: 'When would you tell someone RAG is the wrong tool?',
      answer:
        'When the missing thing is not facts. If the task needs reasoning over a whole collection - "what is our most common complaint across 40,000 tickets" - retrieval hands the model five tickets and it summarises five tickets; you needed to process all of them. If the task needs behaviour change - wrong tone, ignores your output format - no retrieved passage fixes a habit; that is fine-tuning or a firmer prompt. If the task needs a computation, like total revenue last quarter, that is a database query, not a similarity search. If the whole corpus is 20 pages, paste all 20 pages in and skip the pipeline. And if the facts are public and stable, the model already knows them, so retrieval only adds latency. The test I use: ask what would have to change for the correct answer to change. A document means RAG, a habit means fine-tuning, a number in a table means write a query.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What RAG is, in one sentence', back: 'Find the passages that answer the question, paste them into the prompt, and let the model read instead of remember. Retrieval-augmented generation: retrieval = look it up, augmented = the prompt is enlarged with what you found, generation = the model writes the answer from it.' },
    { front: 'Fine-tuning vs RAG', back: 'Fine-tuning changes how the model behaves (tone, format, task shape). RAG changes what it knows (facts that change, are private, or must be cited). Test: if the right answer changes when a document changes, it is RAG.' },
    { front: 'The five stages', back: 'Chunk the documents, index the chunks, retrieve the top-k for a question, rerank those few with a slower scorer, assemble the prompt and generate with citations.' },
    { front: 'Chunk, top-k, overlap', back: 'Chunk: the piece a document is cut into, and the smallest thing retrieval can ever return. Top-k: how many best-scoring chunks you keep. Overlap: letting consecutive chunks share their edges so a sentence is never cleanly severed.' },
    { front: 'Why two stages instead of one', back: 'A fast scorer is cheap enough to run over millions of chunks and gets the order wrong. A careful scorer gets the order right and is far too slow for millions. Run fast over everything to keep 50, careful over those 50 to keep 5.' },
    { front: 'The three chunking failures', back: 'Too small - the fact is scattered and no chunk is convincing. Too large - the matching words are diluted and the score falls below short irrelevant chunks. Boundary split - the cut lands mid-answer, both halves retrieve, neither answers.' },
    { front: 'Retrieval is a hard ceiling', back: 'If the correct passage is in the top-k for only 60% of questions, end-to-end accuracy cannot exceed 60% however good the model is. Measure retrieval and generation separately or you cannot tell which one to fix.' },
    { front: 'The first thing to check when an answer is wrong', back: 'Print the chunks that were actually retrieved and read them yourself. If they do not answer the question, the bug is in chunking or retrieval and no prompt change will help.' },
  ],
  mindmapMarkdown: `- RAG End to End
  - The problem
    - The model never read your documents
    - It answers anyway - fluent, sourceless, wrong
    - Training facts in: cannot update, cite, or scope per user
  - The idea
    - Put the passage in the prompt; the model reads instead of remembers
    - Grounded answer + free citation
  - Five stages
    - Chunk (strategy, overlap)
    - Index
    - Retrieve top-k (fast, crude)
    - Rerank (slow, careful)
    - Assemble prompt and generate
  - Why two stages
    - Fast over millions keeps 50
    - Careful over 50 keeps 5
    - Distinct words + length penalty flipped c5 to c0
  - Chunking is where it breaks
    - Too small - fact scattered, best score drops to 1
    - Too large - 10 hits, rerank 0.408, loses to off-topic
    - Boundary split - both halves retrieve, neither answers
    - Fixes: 200-500 words, split on structure, overlap, title prefix
  - The classic mistake
    - Answer in the corpus, cut in half by the chunker
    - Blamed on the model, a week lost on the prompt
    - Diagnostic: print the retrieved chunks and read them
  - When RAG is wrong
    - Reasoning over everything, behaviour change, computation, tiny corpus
  - Beyond the basics
    - Hybrid search, query rewriting, permissions in the query, lost in the middle`,
}

export default m
