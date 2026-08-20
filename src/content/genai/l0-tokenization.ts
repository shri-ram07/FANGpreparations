import type { Module } from '../types'

const m: Module = {
  id: 'genai-l0-tokenization',
  subjectId: 'genai',
  level: 0,
  title: 'Tokenization: How Text Becomes Numbers',
  whyItMatters:
    'Every LLM bug that makes people say "the model is dumb" — it cannot count letters, it fails at arithmetic, a trailing space wrecks the prompt, Hindi costs 3x more than English — traces back to this one layer. It is also the cheapest interview win: almost nobody can explain BPE properly, and you will build one here in 40 lines. Tokenization is where your context window and your API bill are actually decided.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'A transformer cannot read',
      md: `Strip the mystique. A neural network is a stack of matrix multiplies. Matrices hold **numbers**. There is nowhere to put the letter "c".

- So before anything else, text must become a list of integers: \`"the cat"\` → \`[464, 3797]\`.
- Each integer is a row index into an **embedding matrix** — a big lookup table of learned vectors, one row per vocabulary entry.
- That is the entire job of a tokenizer: text in, integer ids out. And the reverse for decoding.
- The unit you chop text into is called a **token**, and the fixed set of possible tokens is the **vocabulary** (size V).
- Everything downstream inherits this choice. The model literally cannot perceive anything finer than one token — a fact that comes back to bite in a big way at the end of this module.`,
    },
    {
      type: 'intuition',
      title: 'Three ways to cut text — and why two of them lose',
      md: `You have to pick a chopping rule. There are exactly three families, and the tradeoff is always the same: *vocabulary size versus sequence length versus meaning per token*.

1. **Character-level** — vocabulary is ~100 symbols. Tiny embedding table, and no word is ever "unknown" because every word is made of characters you already have. But "internationalization" becomes 20 tokens, so sequences get 4-5x longer (and attention costs O(n²) in that length). Worse, one character carries almost no meaning — the model must relearn from scratch that t-h-e means "the".
2. **Word-level** — vocabulary is every word you saw: 200k+ for English, and that is before names, typos and URLs. Each token is meaningful, sequences are short. But two killers: the **out-of-vocabulary cliff** — anything unseen at training time collapses to a single \`<UNK>\` token and the information is gone forever — and no shared structure, so "run", "running" and "runner" are three unrelated rows in the table that must each learn "run" independently.
3. **Subword** — chop into frequent *pieces*. Common words stay whole ("the" = 1 token). Rare words split into parts ("tokenization" → "token" + "ization"). Vocabulary lands around 30k-200k, sequences stay short, and "running" shares the piece "run" with "run".

Subword won everything. The rest of this module is how the pieces get chosen.`,
    },
    {
      type: 'intuition',
      title: 'BPE: a 1994 compression algorithm, pointed at text',
      md: `Byte-Pair Encoding was invented to compress files. Somebody noticed it also solves the subword problem, and it now runs inside GPT. The algorithm is five lines and you can do it in your head.

1. Start with every word split into **single characters**. The vocabulary is just the distinct characters.
2. Count every **adjacent pair** across the whole corpus, weighted by how often each word appears.
3. Take the **single most frequent pair** and merge it everywhere into one new symbol. Add that symbol to the vocabulary.
4. Repeat from step 2, N times. N is your knob: vocabulary size = starting characters + N.
5. Stop. Save the **ordered list of merges**.

The key idea most people miss: **the merge list IS the tokenizer.** There is no clever runtime search. To tokenize new text you split it into characters and replay the same merges, in the same order, and whatever symbols survive are your tokens. Training is greedy and frequency-driven; encoding is deterministic replay.`,
    },
    {
      type: 'intuition',
      title: 'Four merges, by hand',
      md: `Corpus of five words with how often each appears: **hug** ×10, **pug** ×5, **pun** ×12, **bun** ×4, **hugs** ×5. Start: \`h|u|g\`, \`p|u|g\`, \`p|u|n\`, \`b|u|n\`, \`h|u|g|s\`. Base vocabulary = {b, g, h, n, p, s, u} — seven symbols.

1. **Count the pairs.** \`u+g\` appears in hug (10), pug (5), hugs (5) = **20**. \`p+u\` = 5+12 = 17. \`u+n\` = 12+4 = 16. \`h+u\` = 10+5 = 15. \`g+s\` = 5, \`b+u\` = 4. Winner: **u+g → "ug"**. Corpus becomes \`h|ug\`, \`p|ug\`, \`p|u|n\`, \`b|u|n\`, \`h|ug|s\`.
2. **Recount** — the merge changed the pairs. Now \`u+n\` = 16 leads (\`h+ug\` = 15, \`p+u\` = 12). Winner: **u+n → "un"**.
3. **Recount.** \`h+ug\` = 15 is now top (\`p+un\` = 12). Winner: **h+ug → "hug"** — a merge built on top of an earlier merge. This is how long tokens grow.
4. **Recount.** \`p+un\` = 12 wins. Winner: **p+un → "pun"**.

Merge list: \`u+g\`, \`u+n\`, \`h+ug\`, \`p+un\`. Vocabulary grew from 7 to 11. Notice what happened without anyone designing it: "hug" and "pun" became single tokens because they were frequent, while "bun" stayed as \`b|un\` because it was rare. Frequency bought wholeness.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A complete BPE trainer in 40 lines — train, print the merge list, encode new words',
      code: `from collections import Counter

corpus = {'hug': 10, 'pug': 5, 'pun': 12, 'bun': 4, 'hugs': 5}
words = {w: list(w) for w in corpus}          # step 0: every word is a list of characters
vocab = sorted({ch for w in corpus for ch in w})
print("start vocab:", vocab, f"({len(vocab)} symbols)")

def pair_counts(words):
    c = Counter()
    for w, toks in words.items():
        for pair in zip(toks, toks[1:]):      # every ADJACENT pair inside the word
            c[pair] += corpus[w]              # weighted by how often the word occurs
    return c

def apply_merge(toks, a, b):
    out, i = [], 0
    while i < len(toks):
        if i < len(toks) - 1 and toks[i] == a and toks[i + 1] == b:
            out.append(a + b); i += 2
        else:
            out.append(toks[i]); i += 1
    return out

merges = []
for step in range(1, 5):                      # N = 4 merges
    counts = pair_counts(words)
    (a, b), n = counts.most_common(1)[0]      # the single most frequent adjacent pair
    merges.append((a, b))
    words = {w: apply_merge(t, a, b) for w, t in words.items()}
    vocab.append(a + b)
    print(f"merge {step}: {a!r}+{b!r} -> {a+b!r}  seen {n}x   corpus now: "
          + "  ".join("|".join(t) for t in words.values()))

print("\\nmerge list (THIS is the tokenizer):", [f"{a}+{b}" for a, b in merges])
print("vocab now:", vocab, f"({len(vocab)} symbols)")

def encode(word):
    toks = list(word)
    for a, b in merges:                       # replay the merges IN ORDER
        toks = apply_merge(toks, a, b)
    return toks

for w in ['hug', 'hugs', 'pun', 'bug', 'mug']:
    t = encode(w)
    oov = [s for s in t if s not in vocab]    # symbols this tokenizer cannot represent
    flag = f"   <- UNK: {oov} never appeared in training" if oov else ""
    print(f"encode({w!r}) -> {t}   {len(w)} chars -> {len(t)} tokens{flag}")

# ---------- real output ----------
# start vocab: ['b', 'g', 'h', 'n', 'p', 's', 'u'] (7 symbols)
# merge 1: 'u'+'g' -> 'ug'  seen 20x   corpus now: h|ug  p|ug  p|u|n  b|u|n  h|ug|s
# merge 2: 'u'+'n' -> 'un'  seen 16x   corpus now: h|ug  p|ug  p|un  b|un  h|ug|s
# merge 3: 'h'+'ug' -> 'hug'  seen 15x   corpus now: hug  p|ug  p|un  b|un  hug|s
# merge 4: 'p'+'un' -> 'pun'  seen 12x   corpus now: hug  p|ug  pun  b|un  hug|s
#
# merge list (THIS is the tokenizer): ['u+g', 'u+n', 'h+ug', 'p+un']
# vocab now: ['b', 'g', 'h', 'n', 'p', 's', 'u', 'ug', 'un', 'hug', 'pun'] (11 symbols)
# encode('hug') -> ['hug']   3 chars -> 1 tokens
# encode('hugs') -> ['hug', 's']   4 chars -> 2 tokens
# encode('pun') -> ['pun']   3 chars -> 1 tokens
# encode('bug') -> ['b', 'ug']   3 chars -> 2 tokens
# encode('mug') -> ['m', 'ug']   3 chars -> 2 tokens   <- UNK: ['m'] never appeared in training`,
      annotations: {
        3: 'Real trainers count words over gigabytes of text first; the dict of word -> frequency is the only thing BPE training ever looks at.',
        5: 'The starting vocabulary is just the distinct characters present. Seven here. In byte-level BPE this line is replaced by "the 256 possible bytes" — and that one change removes UNK forever.',
        12: 'Pairs are weighted by word frequency, not counted once per word type. A word appearing 12 times votes 12 times.',
        27: 'The whole algorithm is this line: take the single most frequent adjacent pair. Greedy, no lookahead, no optimization objective. Ties are broken arbitrarily — which is why two BPE implementations can disagree on a tie and produce different vocabularies.',
        29: 'The merge is applied everywhere at once, then the counts are recomputed from scratch. Merging changes which pairs exist — that is why step 3 could pick h+ug, a merge stacked on a previous merge.',
        34: 'This ordered list is the entire trained artifact. Ship this file and you have shipped the tokenizer.',
        39: 'Encoding replays merges in learned order. Order is load-bearing: applying u+n before u+g on some word would give a different split. Never sort the merge list.',
        45: 'The out-of-vocabulary check made explicit.',
        51: 'u+g won at 20 over p+u (17), u+n (16), h+u (15). Frequency alone decided that "ug" deserves to be a token.',
        62: 'The failure mode: the letter m never appeared in training, so this character-level BPE has no id for it. Real word/char tokenizers emit <UNK> here and the information is destroyed. Byte-level BPE, next section, makes this impossible.',
      },
    },
    {
      type: 'note',
      md: 'Two things to take from that output. First, `encode(\'hug\')` returns ONE token while `encode(\'bug\')` returns two — the tokenizer is a frequency snapshot of its training corpus, not a linguist. Second, `mug` broke it. Scale that up: a tokenizer trained on English web text meets a Tamil word, a novel emoji, or a base64 blob, and something has to give.',
    },
    {
      type: 'intuition',
      title: 'Byte-level BPE: the trick that kills UNK forever',
      md: `GPT-2 fixed the \`<UNK>\` problem with a change so simple it is almost cheating: **do not start from characters, start from bytes.**

- Any text on earth, in any language, is UTF-8 — a sequence of bytes, each 0-255.
- So make the base vocabulary the **256 possible byte values**. Then run exactly the BPE loop you just wrote, on byte sequences.
- Now every possible input is representable, by construction. There is no unknown token, ever. Not for emoji, not for Klingon, not for a corrupted binary paste.
- The bill: characters outside ASCII cost multiple bytes, so they start life shattered. \`é\` is 2 UTF-8 bytes. \`你\` is 3. \`नमस्ते\` is 6 characters but **18 bytes**. \`🙂\` is 4 bytes.
- If the training corpus had enough Hindi, BPE will have merged those byte runs back into whole Hindi tokens and you never notice. If it did not, Hindi text tokenizes near the byte level and costs 3-4x more tokens than the same meaning in English.
- That is not a bug in the algorithm. It is the training corpus's language mix, made visible on your invoice.`,
    },
    {
      type: 'note',
      md: 'The other three names you will be asked about, one line each. **WordPiece** (BERT): same merge loop, but it picks the pair that maximizes corpus likelihood rather than raw count — roughly, it prefers pairs whose parts are rare on their own; continuation pieces are marked `##ing`. **Unigram** (used by ALBERT, T5): works backwards — start with a huge candidate vocabulary and iteratively *delete* the pieces whose removal hurts likelihood least; it can score multiple segmentations of the same word, which enables subword regularization. **SentencePiece** is not an algorithm but the library/format that wraps BPE or Unigram and adds the multilingual-friendly part: it treats the **space as a normal character** (rendered `▁`), so it needs no language-specific pre-tokenizer and works on Japanese or Thai, which have no spaces — and decoding becomes exactly lossless string concatenation.',
    },
    {
      type: 'note',
      md: 'Step the demo below one merge at a time and watch two different things happen at once. Frequent substrings **fuse** — `t`+`h` becomes `th`, then `the`, then later `trans` and `former` slam together into a single `transformer` token. Meanwhile switch to the sample `zyxwv quartz` and step all the way to the end: it stays shattered into single characters, because no merge in the list ever saw those letter pairs. That contrast is the entire module in one screen — common text is cheap, rare text is expensive, and the model sees the pieces, never the letters.',
    },
    { type: 'visual', component: 'TokenizerDemo', props: {} },
    {
      type: 'intuition',
      title: 'Tokens are not words — and that is your bill',
      md: `Every practical consequence of tokenization starts here. Rules of thumb for English:

- **~4 characters per token.** **~0.75 words per token** — i.e. 1,000 tokens ≈ 750 English words ≈ 4,000 characters ≈ 1.5 pages of prose.
- Common words are 1 token. Rare words, names, technical terms and typos are 2-4. Leading spaces are usually part of the token: \` the\` and \`the\` are *different ids*.
- **Code is worse**: indentation, braces, \`snake_case\` and \`camelCase\` all fragment. Budget closer to 2.5-3 characters per token.
- **Non-English is much worse.** Devanagari, Chinese, Arabic, Thai — 2-4x the tokens for the same meaning, because of the byte cost plus a corpus that under-trained those merges. Same sentence, same model, triple the price and triple the context consumed. Newer tokenizers (Llama 3's 128k, GPT-4o's 200k vocabulary) exist substantially to fix this.
- Therefore: **the tokenizer decides your real context window.** "128k context" is 128k *tokens*. In English that is roughly 96k words; in Hindi it may be 30k. Never quote a context window in words to a user.
- Cost estimation rule to actually use: \`tokens ≈ characters / 4\` for English prose, \`/ 3\` for code, \`/ 1.5\` for Devanagari or CJK. Then multiply by the per-million price. For anything you are actually billing for, stop estimating and call the real tokenizer library.`,
    },
    {
      type: 'math',
      intro:
        'The vocabulary-size tradeoff, with real models. V = vocabulary size, d = embedding dimension, n = sequence length after tokenizing a fixed piece of text.',
      latex: [
        '\\text{embedding params} = V \\times d \\qquad \\text{output softmax} = \\text{another } V \\times d \\text{ matrix (or the same one, "tied")}',
        'V = 50{,}257,\\; d = 768 \\;\\Rightarrow\\; 38.6\\text{M params} \\;\\approx\\; 31\\% \\text{ of all of GPT-2 small (124M)}',
        'V = 128{,}256,\\; d = 4096 \\;\\Rightarrow\\; 525\\text{M each} \\;\\Rightarrow\\; 1.05\\text{B untied} \\;\\approx\\; 13\\% \\text{ of Llama-3-8B}',
        '\\text{Bigger } V \\;\\Rightarrow\\; \\text{smaller } n \\;\\Rightarrow\\; \\text{attention cost } O(n^2) \\text{ drops quadratically, but } V\\!\\times\\! d \\text{ and the softmax grow linearly.}',
      ],
    },
    {
      type: 'intuition',
      title: 'Why the model cannot count the r\'s in "strawberry"',
      md: `This is the most-asked "gotcha" about LLMs, and the answer is not "the model is stupid". The answer is that **the information is not there**.

- "strawberry" reaches the model as a couple of ids — commonly reported as \`str\` + \`aw\` + \`berry\` for GPT-4's tokenizer. Three integers.
- Nothing in those integers exposes their spelling. Asking the model to count r's is like asking you to count the letters in a phone number you were told over the phone as "the Johnson house line". You know what it refers to; you were never given the characters.
- The model *can* often answer, because training text discusses spelling. It is recalling facts about words, not inspecting them. That is why it is confidently wrong on unusual cases.
- Same root cause for the whole family: **reversing a string**, **rhyming**, **counting syllables**, **pig latin**, **acrostics**, **"words starting with q"**.
- **Arithmetic** has a related but distinct problem: number tokenization is inconsistent. Depending on the tokenizer, "1234" may be one token, or \`123\`+\`4\`, or \`12\`+\`34\`, while "1235" splits differently — so digits do not line up by place value and the model cannot learn a clean columnar addition algorithm. Llama tokenizers split every digit separately partly for this reason, and it measurably helps.
- The fix in production is not a better prompt: **give the model a tool.** A calculator, a \`len()\` call, a regex. Character-level work belongs in code, not in the weights.`,
    },
    {
      type: 'note',
      md: 'The trailing-whitespace trap, because it costs people real debugging hours. In GPT-family tokenizers the leading space belongs to the token — ` Paris` is one token, `Paris` is a different one. So a prompt ending `"Answer:"` is healthy: the model happily emits ` Paris`. A prompt ending `"Answer: "` with a trailing space is not: you have already spent the space, so the model must now produce a token that starts mid-word, which is a shape it rarely saw in training. Output quality drops for a reason invisible in the text. Rule: **never end a prompt with a trailing space or newline you did not mean.** Related: the tokenizer must match the model exactly — swapping in a different tokenizer maps text to ids the weights never learned, and you get fluent nonsense, not an error.',
    },
    {
      type: 'note',
      md: 'Finally, the reserved ids. Beyond the learned merges, vocabularies include **special tokens**: `<|endoftext|>` / EOS ends a document or a generation, BOS marks a start, PAD fills a batch to equal length (and is masked out of the loss), and UNK is the fallback that byte-level BPE made obsolete. Chat models add more: the `system` / `user` / `assistant` roles you pass to an API are not magic — a **chat template** renders them into special tokens like `<|im_start|>user` before the text ever reaches the model. Two consequences: those wrapper tokens cost you context on every single turn, and a user who types a role marker into their message is doing the first step of a prompt injection, which is why tokenizers mark special tokens as non-generatable from raw user text.',
    },
    {
      type: 'intuition',
      title: 'Where the ids go next: the embedding table',
      md: `One loose end, and it is the handoff to everything else. The tokenizer hands the model integers, and an integer carries no meaning — id 464 is not "more" than id 262, and ids 100 and 101 are not related. Meaning arrives one step later.

- Immediately after the tokenizer sits one learned matrix of shape **V × d_model**: one row per vocabulary entry, each row a vector of d_model numbers (768 in GPT-2 small, 4096 in a 7B model).
- The token id is nothing but a **row index**. Embedding lookup is literally \`table[id]\` — a memory read, not a matrix multiply. That is exactly why the ids themselves are allowed to be arbitrary.
- Those rows start as random noise and are **learned by gradient descent**, like any other weight. Nobody hand-writes what "cat" means.
- Tokens that appear in similar contexts receive similar gradients, so their rows drift close together. That geometry — not the integer — is where meaning ends up living.
- This is the same V × d matrix from the math block above, the one that is 31% of GPT-2 small. Vocabulary size is an embedding-table decision as much as a tokenizer decision.

The full treatment — cosine similarity, sentence embeddings, ANN indexes — belongs to the module *Embeddings, Vector Databases & Semantic Search*, so do not chase it here. Hold onto the seam: **the tokenizer produces row indices; the embedding table turns them into vectors.**`,
    },
  ],
  quiz: [
    {
      question: 'What is the single biggest failure of a pure word-level tokenizer?',
      options: [
        {
          text: 'The vocabulary is too small to be useful',
          explanation: 'The opposite — word vocabularies are enormous (200k+ for English), which is a separate problem.',
        },
        {
          text: 'Any word unseen during training collapses to <UNK> and its information is permanently lost',
          explanation:
            'Correct. That is the out-of-vocabulary cliff. Typos, names, new slang and code identifiers all fall off it, and no amount of model capacity recovers what the tokenizer threw away.',
        },
        {
          text: 'Sequences become far too long',
          explanation: 'Word-level gives the SHORTEST sequences of the three families. Length is character-level\'s problem.',
        },
      ],
      correct: 1,
    },
    {
      question: 'In BPE training, which pair gets merged at each step?',
      options: [
        { text: 'A random pair, for regularization', explanation: 'Training is fully deterministic and greedy. (Randomized segmentation exists at ENCODE time in Unigram models, which is a different thing.)' },
        { text: 'The longest pair available', explanation: 'Length is never consulted. Long tokens emerge only because frequent merges stack on top of earlier frequent merges.' },
        {
          text: 'The most frequent adjacent pair in the current corpus, weighted by word frequency',
          explanation: 'Correct. Count all adjacent pairs, take the argmax, merge it everywhere, recount. That recount matters — merging changes which pairs exist.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You trained BPE and now need to tokenize a new sentence. What do you actually do?',
      options: [
        {
          text: 'Split into characters and replay the learned merges in their original order',
          explanation:
            'Correct. The ordered merge list IS the tokenizer. Encoding is deterministic replay — no search, no re-counting. Sorting or reordering that list silently produces a different tokenizer.',
        },
        { text: 'Re-run the training loop on the new sentence', explanation: 'That would invent new merges and produce ids the model has never seen. Training happens once, offline.' },
        { text: 'Look each word up in a dictionary of known words', explanation: 'That is word-level tokenization, and it reintroduces the OOV cliff BPE exists to remove.' },
      ],
      correct: 0,
    },
    {
      question: 'Why does byte-level BPE guarantee no unknown token, ever?',
      options: [
        { text: 'Because it has a very large vocabulary', explanation: 'Vocabulary size does not create a guarantee — a 200k word vocabulary still misses the 200,001st word.' },
        { text: 'Because it falls back to <UNK> gracefully', explanation: 'Backwards: the whole point is that no <UNK> token is needed at all.' },
        {
          text: 'Because the base vocabulary is all 256 byte values, and every possible input is a sequence of bytes',
          explanation:
            'Correct, and it is a guarantee by construction rather than by coverage. The cost is that non-ASCII characters take 2-4 bytes each, so under-trained languages tokenize near the byte level and get expensive.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Roughly how many tokens is 400 characters of ordinary English prose?',
      options: [
        { text: 'About 400 — one token per character', explanation: 'That is character-level tokenization, which no production LLM uses.' },
        {
          text: 'About 100 — the ~4-characters-per-token rule',
          explanation: 'Correct. Equivalently ~0.75 words per token: 1,000 tokens ≈ 750 English words. For code use ~3 chars/token, for Devanagari or CJK closer to ~1.5.',
        },
        { text: 'About 25', explanation: 'That would be 16 characters per token — far beyond what any subword vocabulary achieves on real text.' },
      ],
      correct: 1,
    },
    {
      question: 'An LLM insists "strawberry" has two r\'s. What is the real cause?',
      options: [
        {
          text: 'The model never receives the letters — it receives a few token ids, so the spelling information is genuinely absent',
          explanation:
            'Correct. It answers from things training text said ABOUT words, not by inspecting them. Same root cause as failing at reversal, rhyming and syllable counting. The production fix is a tool call, not a better prompt.',
        },
        { text: 'The model was undertrained and more data would fix it', explanation: 'More data teaches more memorized spelling facts, but the character information still never enters the forward pass.' },
        { text: 'Its temperature setting is too high', explanation: 'Sampling settings change which token is picked from a distribution; they cannot add information that was never in the input.' },
      ],
      correct: 0,
    },
    {
      question: 'What does increasing the vocabulary from 32k to 128k buy you, and what does it cost?',
      options: [
        { text: 'Buys nothing; costs nothing — it is a cosmetic choice', explanation: 'It changes both parameter count and sequence length materially; it is one of the more consequential architecture knobs.' },
        { text: 'Buys accuracy on every task; costs training time only', explanation: 'There is no direct accuracy guarantee, and the cost is structural (parameters and memory), not just wall-clock.' },
        {
          text: 'Buys shorter sequences (attention is O(n²), so the saving is quadratic); costs a 4x fatter embedding matrix and output softmax',
          explanation:
            'Correct. 128,256 × 4096 = 525M parameters per embedding matrix versus 131M at 32k. Bigger vocabularies also help under-represented languages by giving their byte runs real merges.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does ending a prompt with a trailing space hurt output quality in GPT-family models?',
      options: [
        { text: 'The API strips it, so the prompt is truncated', explanation: 'Nothing is stripped or truncated — the space is tokenized like any other text.' },
        {
          text: 'Leading spaces belong to the token, so you have consumed the space and forced the model to start a word mid-token — a distribution it rarely saw',
          explanation:
            'Correct. ` Paris` and `Paris` are different ids. End with "Answer:" and the model emits ` Paris` naturally; end with "Answer: " and it must produce an unusual continuation. Silent quality loss, invisible in the text.',
        },
        { text: 'Whitespace tokens are expensive, so it wastes context', explanation: 'One extra token is negligible cost — the damage is distributional, not budgetary.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain BPE to me as if I have never seen it. Then tell me what the trained artifact actually is.',
      answer:
        'Start with every word split into characters, so the vocabulary is just the distinct characters. Count every adjacent pair across the corpus, weighted by how often each word appears. Take the single most frequent pair, merge it everywhere into one new symbol, add that symbol to the vocabulary, and recount — recounting matters because merging changes which pairs exist, which is how merges stack into long tokens. Repeat N times; vocabulary size = base characters + N. The trained artifact is the **ordered list of merges** plus the resulting vocabulary — that is the whole tokenizer, a text file. Encoding new text is not a search: you split into characters and replay the same merges in the same order. Say the order matters, because it is the detail that separates people who have implemented it from people who have read about it.',
      isCaseBased: false,
    },
    {
      question: 'Compare character-level, word-level and subword tokenization. Give the tradeoff axis, not just a list.',
      answer:
        'The axis is: vocabulary size traded against sequence length traded against meaning per token. Character-level: ~100 vocabulary, no OOV ever, but sequences 4-5x longer, and attention is O(n²) in that length, so it is expensive — plus each token carries almost no meaning, so the model burns capacity relearning that t-h-e means "the". Word-level: shortest sequences and maximum meaning per token, but a 200k+ vocabulary, a hard OOV cliff where anything unseen becomes <UNK> and is destroyed, and no morphological sharing — "run" and "running" are unrelated rows. Subword sits in the middle deliberately: 30k-200k vocabulary, frequent words stay whole, rare words decompose into reusable pieces, no OOV once you go byte-level. It is not a compromise that loses on both ends; it is the only option where the failure modes of the other two both disappear.',
      isCaseBased: false,
    },
    {
      question: 'What is byte-level BPE and why did GPT-2 adopt it?',
      answer:
        'Instead of starting from characters, start from the 256 possible byte values and run the identical BPE loop on UTF-8 byte sequences. Because all text is bytes, every conceivable input is representable — no <UNK> token needs to exist. That matters for web-scale training data, which contains emoji, every language, mojibake and binary paste. The cost is that non-ASCII characters occupy multiple bytes: "é" is 2 bytes, a CJK character 3, a Devanagari character 3, an emoji 4 — so if the training corpus did not contain enough of a language, BPE never learned merges for those byte runs and that language tokenizes near the byte level. One nuance worth mentioning: GPT-2 uses a reversible byte-to-unicode mapping so that whitespace and control bytes get printable stand-ins, which keeps the merge machinery text-based and the decode lossless.',
      isCaseBased: false,
    },
    {
      question: 'Case: your RAG product works well in English but users in India report it gives worse answers and costs 3x more per query. Diagnose.',
      answer:
        'First hypothesis is the tokenizer, and it explains both symptoms at once. Devanagari costs 3 UTF-8 bytes per character, and if the tokenizer\'s corpus was English-heavy it never learned merges for those byte runs, so Hindi text tokenizes near the byte level — 3-4x the tokens for the same meaning. That directly triples cost. It also silently shrinks the effective context: your retriever\'s "top 8 chunks" now overflows the window, or your chunker\'s "500 tokens per chunk" is now cutting sentences into thirds of what it does in English, wrecking retrieval quality. Verification: run the real tokenizer over matched English/Hindi sentence pairs and compare token counts — this is a five-minute measurement, do it before theorizing further. Fixes, ranked: (1) switch to a model whose tokenizer has a large multilingual vocabulary (Llama 3\'s 128k, GPT-4o\'s ~200k) — usually the biggest single win; (2) define chunk sizes in tokens using that exact tokenizer, never in characters or words; (3) re-tune retrieval top-k against the real token budget; (4) only if you control training, extend the vocabulary or train a SentencePiece model on your domain — expensive and requires re-training embeddings. Name the tradeoff honestly: options 1-3 are configuration, option 4 is a project.',
      isCaseBased: true,
    },
    {
      question: 'Why do LLMs fail at counting letters, reversing strings and rhyming? Is this fixable by scale?',
      answer:
        'Because the character information never enters the model. "strawberry" arrives as a handful of token ids — commonly reported as str + aw + berry for GPT-4\'s tokenizer — and nothing in an integer exposes its spelling. When the model does answer correctly it is recalling what training text said about the word, not inspecting it, which is exactly why it is confidently wrong on unusual words. Scale helps only in that memorized-spelling sense; it does not put characters into the forward pass. Genuinely related failures: reversal, syllable counting, pig latin, acrostics, "words starting with q". Arithmetic is adjacent but distinct: number tokenization is inconsistent, so "1234" and "1235" can split at different boundaries and digits do not align by place value — several model families now split every digit into its own token specifically to fix this, and it measurably helps. The production answer is a tool call: character work and arithmetic belong in code, not in weights.',
      isCaseBased: false,
    },
    {
      question: 'How does vocabulary size interact with model size and inference cost? Use numbers.',
      answer:
        'The embedding matrix is V×d, and the output projection is another V×d unless they are tied. GPT-2 small: 50,257 × 768 = 38.6M parameters, which is about 31% of its 124M total — the vocabulary dominates a small model. Llama-3-8B: 128,256 × 4096 = 525M per matrix, untied, so ~1.05B of 8B, around 13%. What a bigger vocabulary buys is shorter sequences for the same text, and since attention is O(n²), a 15% reduction in tokens is roughly a 28% reduction in attention cost — plus proportionally smaller KV-cache. What it costs is those parameters, the memory to hold them, and a wider final softmax on every generated token. The sweet spot has moved up over time (32k → 128k → 200k) mostly because multilingual coverage was the binding constraint, not because the compute math changed.',
      isCaseBased: false,
    },
    {
      question: 'Case: you fine-tuned a model and outputs are fluent but semantically garbage — grammatical sentences about nothing. No errors anywhere. Where do you look?',
      answer:
        'Fluent-but-wrong with zero errors points at an id-space mismatch, and the tokenizer is the first suspect. Checks in order: (1) Are you using the exact tokenizer that shipped with the checkpoint? Loading a different tokenizer maps text to ids the weights never learned — the model still produces confident, well-formed text, because the language modelling head is intact; it is just reading a different language. (2) Did you add special tokens or extend the vocabulary without resizing the embedding matrix, or resize it and leave the new rows randomly initialized? (3) Does your training data go through the model\'s chat template, or did you hand it raw text while inference applies the template? A template mismatch means the model never sees the role markers it was aligned around. (4) Check BOS/EOS: a missing EOS means the model never learned to stop; a doubled BOS shifts everything. (5) Sanity test that decodes cleanly: encode a sentence, decode it back, assert the round trip is identical. The general lesson to state: tokenizer bugs do not crash, they degrade — which is why they hide.',
      isCaseBased: true,
    },
    {
      question: 'Explain WordPiece, Unigram and SentencePiece, and when you would pick each.',
      answer:
        'WordPiece (BERT) runs the same merge loop as BPE but selects the pair that maximizes corpus likelihood rather than raw frequency — informally it prefers merging pieces that are rare individually but common together; continuation pieces are prefixed "##". Unigram (T5, ALBERT) inverts the direction: start from a large candidate vocabulary and iteratively prune the pieces whose removal costs the least likelihood. Because Unigram keeps a probability per piece, it can score multiple segmentations of the same word, which enables subword regularization — sampling different segmentations during training as data augmentation. SentencePiece is not a third algorithm; it is the library and file format that wraps BPE or Unigram and adds the genuinely important bit: it treats the space as an ordinary character (shown as ▁), so it needs no language-specific pre-tokenizer and works on Japanese, Chinese and Thai, which have no spaces — and decoding becomes exact string concatenation, fully lossless. Picking: byte-level BPE for a general generative LLM, SentencePiece+Unigram when multilinguality or a space-free language is central, WordPiece essentially only for BERT-lineage compatibility.',
      isCaseBased: false,
    },
    {
      question: 'What are special tokens, and what breaks if you get them wrong?',
      answer:
        'They are reserved vocabulary entries carrying structure rather than text: EOS/<|endoftext|> ends a document or a generation, BOS marks a start, PAD pads a batch to equal length and must be masked out of both the loss and attention, and UNK is the fallback that byte-level BPE made obsolete. Chat models add role markers — <|im_start|>system, and so on — which a chat template renders from the messages array before anything reaches the model. Failure modes: no EOS in training data means generation never stops; PAD not masked means the model trains on padding and learns to emit it; BOS added twice shifts every position; a chat template mismatch between fine-tuning and serving produces fluent off-target output. And a security point worth raising unprompted: if raw user text could tokenize into role markers, a user could forge a system turn — so tokenizers mark special tokens as not producible from user text, and you should keep it that way.',
      isCaseBased: false,
    },
    {
      question: 'Case: you must estimate the monthly LLM cost for a feature before writing any code. How do you do it, and where does tokenization make you wrong?',
      answer:
        'Build the estimate per request first: system prompt tokens + retrieved context + user message + output tokens, priced separately because input and output have different rates and output is usually several times more expensive. Convert with characters/4 for English prose, characters/3 for code, characters/1.5 for Devanagari or CJK — then multiply by requests per month. Where tokenization makes you wrong, in order of damage: (1) forgetting that the system prompt and chat-template wrapper tokens are re-sent on every single turn, and in a multi-turn chat the whole history is re-sent, so cost grows quadratically with conversation length, not linearly — this is the one that blows budgets; (2) assuming a non-English user base costs the same as English, when it can be 3x; (3) estimating in words instead of tokens for retrieved chunks, which is where the volume actually is; (4) ignoring that output tokens dominate for generative features. The discipline: estimate with the rule of thumb to size the decision, then run the real tokenizer over a sample of actual traffic before committing to a price. And name the mitigations — prompt caching for the repeated prefix, and trimming or summarizing history — because that is what the interviewer is fishing for.',
      isCaseBased: true,
    },
    {
      question: 'Someone proposes training a new LLM with a character-level tokenizer to "avoid all these problems". Argue both sides.',
      answer:
        'For: no OOV by construction, a ~100-symbol vocabulary so the embedding matrix and softmax nearly vanish, genuinely uniform cost across languages, and the character tasks — spelling, reversal, rhyming, arithmetic alignment — become natively solvable because the model actually sees letters. Against, and this is why nobody ships it: sequences get 4-5x longer, and attention is O(n²) in sequence length, so the same document costs roughly 16-25x more attention compute; the effective context window shrinks by the same factor; each token carries so little information that the model must spend depth reconstructing word identity before it can reason; and training is correspondingly slower to reach the same quality. The honest current position: it is an active research direction — byte-level and tokenizer-free architectures with learned patching exist and are improving — and the blocker is the quadratic cost of long sequences, so progress there is coupled to progress in efficient attention. A strong answer names that coupling rather than just declaring character-level dead.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why tokenize at all?', back: 'Networks multiply matrices, not strings. Text must become integer ids that index rows of an embedding matrix. Token = the chopping unit, vocabulary = the fixed set of possible tokens.' },
    { front: 'The three granularities, in one line each', back: 'Character: tiny vocab, no OOV, but 4-5x longer sequences and almost no meaning per token. Word: short sequences and rich tokens, but 200k+ vocab and a hard OOV cliff. Subword: the compromise that won.' },
    { front: 'BPE training loop', back: 'Split into characters → count adjacent pairs (weighted by word frequency) → merge the single most frequent pair everywhere → recount → repeat N times. Vocab size = base characters + N.' },
    { front: 'What is the trained BPE artifact?', back: 'The ORDERED merge list (plus the vocabulary). Encoding new text = split to characters and replay those merges in the same order. Order is load-bearing; never sort it.' },
    { front: 'Byte-level BPE', back: 'Base vocabulary = the 256 byte values, so every possible UTF-8 input is representable and <UNK> never exists. Cost: non-ASCII characters are 2-4 bytes each, so under-trained languages tokenize near the byte level.' },
    { front: 'WordPiece vs Unigram vs SentencePiece', back: 'WordPiece (BERT): merge by likelihood gain, "##" continuations. Unigram (T5): prune a big vocab by likelihood loss, allows sampled segmentations. SentencePiece: the wrapper that treats space as a character (▁) — no pre-tokenizer, works on space-free languages, lossless decode.' },
    { front: 'Token count rules of thumb (English)', back: '~4 characters/token, ~0.75 words/token → 1,000 tokens ≈ 750 words ≈ 4,000 characters. Code ~3 chars/token. Devanagari/CJK ~1.5. Context windows are quoted in tokens, never words.' },
    { front: 'Why LLMs fail at "count the r\'s in strawberry"', back: 'The model receives a few token ids, never the letters — the information is genuinely absent. Same cause: reversal, rhyming, syllable counts, acrostics. Fix with a tool call, not a better prompt.' },
    { front: 'Vocabulary-size tradeoff', back: 'Bigger V → shorter sequences → attention O(n²) cost drops quadratically. But embedding and output softmax are V×d each. GPT-2: 50,257×768 = 38.6M ≈ 31% of a 124M model. Llama-3-8B: 128,256×4096 = 525M each.' },
    { front: 'What happens to a token id after tokenization?', back: 'It indexes one row of the embedding table, a learned V × d_model matrix. The id is meaningless; the row is not. Rows are trained by gradient descent, and tokens used in similar contexts end up with nearby rows. Detail lives in "Embeddings, Vector Databases & Semantic Search".' },
    { front: 'Trailing whitespace + special tokens', back: 'Leading spaces belong to the token, so a trailing space in a prompt forces an off-distribution mid-word start. Special tokens (BOS/EOS/PAD/UNK) plus chat-template role markers are reserved ids — mismatched templates or a missing EOS degrade output silently rather than erroring.' },
  ],
  mindmapMarkdown: `- Tokenization: How Text Becomes Numbers
  - Why at all
    - networks multiply matrices, not strings
    - text -> integer ids -> embedding rows
    - vocabulary V = the fixed set of tokens
  - Three granularities
    - character: ~100 vocab, no OOV, 4-5x longer seq, no meaning per token
    - word: short seq, but 200k vocab + OOV cliff + run/running unrelated
    - subword: the compromise that won
  - BPE, step by step
    - start from characters
    - count adjacent pairs (weighted by word freq)
    - merge the most frequent pair everywhere
    - recount, repeat N times
    - vocab = base chars + N
  - The artifact
    - the ORDERED merge list IS the tokenizer
    - encoding = replay merges in order
    - order is load-bearing, never sort
    - worked example: ug, un, hug, pun
  - Byte-level BPE (GPT)
    - base vocab = 256 bytes
    - no UNK, ever, by construction
    - non-ASCII costs 2-4 bytes per char
    - namaste = 6 chars but 18 bytes
  - Other algorithms
    - WordPiece (BERT): likelihood merges, ## continuations
    - Unigram (T5): prune a big vocab, sampled segmentations
    - SentencePiece: space as a character, no pre-tokenizer, lossless
  - Tokens are not words
    - ~4 chars/token, ~0.75 words/token
    - code ~3 chars/token
    - Hindi/CJK 2-4x more tokens = 3x cost
    - the tokenizer sets the REAL context capacity
    - cost rule: chars/4, then per-million price
  - Vocab-size tradeoff
    - bigger V -> shorter n -> O(n^2) attention drops
    - but embedding + softmax are V x d each
    - GPT-2: 50,257 x 768 = 38.6M = 31% of 124M
    - Llama-3-8B: 128,256 x 4096 = 525M each
  - Failure modes
    - counting r's in strawberry: letters never reach the model
    - reversing, rhyming, syllables, acrostics
    - numbers split inconsistently -> weak arithmetic
    - trailing space forces an off-distribution start
    - wrong tokenizer = fluent nonsense, no error
    - fix character tasks with a tool, not a prompt
  - Special tokens
    - BOS / EOS / PAD / UNK
    - chat templates render roles into reserved ids
    - wrapper tokens cost context every turn
    - user-forged role markers = prompt injection`,
}

export default m
