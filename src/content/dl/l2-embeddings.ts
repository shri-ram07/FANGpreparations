import type { Module } from '../types'

const m: Module = {
  id: 'dl-l2-embeddings',
  subjectId: 'dl',
  level: 2,
  title: 'Embeddings: Meaning as Vectors',
  whyItMatters:
    'Every model that reads text starts here: words are symbols, networks eat numbers, and embeddings are the bridge. The idea — meaning becomes a location, closeness becomes relatedness — runs from Word2Vec in 2013 straight through to the vector database behind every RAG system today. Interviewers probe it because it is the one place where a candidate either understands representation learning or is reciting "king minus man plus woman".',
  estMinutes: 45,
  sections: [
    {
      type: 'intuition',
      title: 'One-hot: 50,000 dimensions that say nothing',
      md: `Your vocabulary has 50,000 words. Give each one its own axis: "cat" becomes a vector with a 1 in slot 8,412 and zeros everywhere else.

- That is **one-hot encoding**. It identifies a word. It tells you nothing about it.
- Dot product between any two different one-hot vectors: **0**. Always. No exceptions.
- So "cat" sits exactly as far from "dog" as it does from "helicopter".
- Every semantic relationship in the language has been thrown away by construction.
- And it is enormous: 50,000 numbers per token, 99.998% of them zero.`,
    },
    {
      type: 'math',
      intro: 'One-hot geometry, written once. V = vocabulary size, e_i = the one-hot for word i.',
      latex: [
        'e_{\\text{cat}} \\cdot e_{\\text{dog}} \\;=\\; 0 \\;=\\; e_{\\text{cat}} \\cdot e_{\\text{helicopter}}',
        '\\lVert e_a - e_b \\rVert_2 = \\sqrt{2} \\qquad \\text{for every pair } a \\neq b',
        '\\text{Equidistant. The representation is a set of ID numbers wearing a vector costume.}',
      ],
    },
    {
      type: 'intuition',
      title: 'The embedding idea: meaning becomes a place',
      md: `Stop giving each word its own axis. Give each word an **address** in one small shared space — say 300 numbers instead of 50,000.

- Nobody hand-writes those numbers. They are **learned**, exactly like any other weights.
- The rule the space enforces: *close together = related*, far apart = unrelated.
- "Close" is measured with the dot product — the same similarity tool from the math subject's *Vectors & the Dot Product* module.
- Dense, low-dimensional, learned. That is the complete definition of an embedding.
- Free bonus: the vector is now short enough to feed straight into a network.`,
    },
    {
      type: 'note',
      md: `An **embedding layer** is a matrix E of shape (vocab, d) — one row per word — and that matrix is trainable. Looking up "cat" means taking row 8,412. Mechanically it *is* a one-hot vector times E, but multiplying 50,000 numbers to select one row is absurd, so every framework implements it as an indexed lookup. Identical math, roughly 50,000× less work. Gradients still flow: each batch updates only the rows it actually touched.`,
    },
    {
      type: 'math',
      intro: 'Why "lookup table" and "matrix multiply" are the same sentence.',
      latex: [
        'e_i \\in \\mathbb{R}^{V}, \\quad E \\in \\mathbb{R}^{V \\times d} \\;\\Longrightarrow\\; e_i^{\\top} E \\;=\\; E_{i,:} \\quad (\\text{row } i)',
        '\\text{Selecting a row } \\equiv \\text{ multiplying by a one-hot. The lookup is the optimization.}',
      ],
    },
    { type: 'visual', component: 'VectorPlayground', props: {} },
    {
      type: 'note',
      md: 'Two vectors, one dot product — the whole embedding idea in a picture. Drag the arrowheads: pointing the same way gives a big positive number ("related"), a right angle gives exactly zero ("unrelated"), opposite gives negative. Now imagine 300 dimensions instead of 2 and a vector per word, and you have Word2Vec. The analogy arithmetic below is that same geometry: **king − man + woman** is vector addition, and "≈ queen" means the result lands closest to queen\'s arrow.',
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: `Read the grid above as an embedding argument, not an attention one. Every cell is a **dot product between two token vectors** — one number saying how aligned two meanings are. Bright cell = the two vectors point the same way = related. That is "closeness means relatedness", drawn. The only extra step attention adds later is using each row of scores as mixing weights. Same machinery, one extra move.`,
    },
    {
      type: 'intuition',
      title: 'Word2Vec: judge a word by the company it keeps',
      md: `So how do you learn those 300 numbers with no labelled data? **Word2Vec** (2013) had the trick: let the text supervise itself.

- The **distributional hypothesis**: *"You shall know a word by the company it keeps."* (Firth, 1957.)
- "I poured a cup of ___" — coffee, tea, water fit. Helicopter does not.
- So words appearing in similar neighbourhoods should end up with similar vectors. That is the entire training signal.
- Slide a window (typically ±5 words) across a billion words of text; every window is a training example.
- No annotators, no labels, no cost. The corpus is its own answer key.`,
    },
    {
      type: 'intuition',
      title: 'Skip-gram vs CBOW: same window, opposite arrow',
      md: `Take the window "the **cat** *sat* on the mat". Two ways to turn it into a prediction task.

- **Skip-gram**: given the CENTRE word, predict each context word. sat → cat, on, the.
- **CBOW** (Continuous Bag of Words): average the CONTEXT, predict the centre. cat, on, the → sat.
- Skip-gram creates one example per context word — more updates per sentence, so it wins on **rare words** and smaller corpora. Slower.
- CBOW collapses the context into a single averaged example — faster, smoother gradients, better on **frequent words** and huge corpora.
- Practical default: skip-gram with negative sampling. Quality usually beats speed here.`,
    },
    {
      type: 'intuition',
      title: 'Negative sampling: stop asking 50,000 questions',
      md: `The honest objective needs a softmax over the entire vocabulary — 50,000 exponentials and a full-matrix gradient for **every single window**. Unaffordable in 2013, wasteful now.

- Reframe the task. Instead of "which of 50,000 words is it?", ask "**is this pair real?**"
- Positive example: (sat, cat) — actually observed together. Label 1.
- Negative examples: (sat, helicopter), (sat, quarterly)... pulled at random. Label 0.
- Train a **binary** classifier — logistic, not softmax — on 1 positive against K negatives, K around 5 to 20.
- Cost per step falls from 50,000 to about 21. The embeddings come out the same; the training becomes possible.`,
    },
    {
      type: 'math',
      intro: 'The expensive objective and the cheap one, side by side. v = vector for a word, sigma = logistic.',
      latex: [
        'P(w_o \\mid w_c) = \\frac{\\exp(v_{w_o}^{\\top} v_{w_c})}{\\sum_{w=1}^{V} \\exp(v_{w}^{\\top} v_{w_c})} \\qquad \\text{denominator sums over all } V \\approx 50{,}000',
        '\\mathcal{L} = \\log \\sigma\\!\\left(v_{w_o}^{\\top} v_{w_c}\\right) \\;+\\; \\sum_{k=1}^{K} \\log \\sigma\\!\\left(-\\,v_{w_k}^{\\top} v_{w_c}\\right), \\quad w_k \\sim P_n(w)',
        '\\text{Push the real pair up, push } K \\text{ random pairs down. } O(V) \\to O(K).',
      ],
    },
    {
      type: 'note',
      md: `One detail interviewers like: negatives are not drawn uniformly. Word2Vec samples them from the unigram frequency distribution raised to the power **0.75**. Raw frequency would make "the" a negative every time; uniform would make rare junk words the negatives and teach nothing. The 0.75 exponent flattens the curve — common words still appear often, rare words get a real chance. Frequent words are also randomly *subsampled* out of the positives for the same reason.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Hand-built 3-D embeddings — cosine similarity and the analogy, with real output',
      code: `import numpy as np

# Hand-set 3-D "embeddings". Axes: [royalty, femaleness, aliveness]
E = {
    'king':       np.array([0.95, -0.35,  0.85]),
    'queen':      np.array([0.90,  0.38,  0.82]),
    'man':        np.array([0.15, -0.40,  0.90]),
    'woman':      np.array([0.12,  0.42,  0.90]),
    'cat':        np.array([0.05, -0.02,  0.80]),
    'dog':        np.array([0.02,  0.03,  0.84]),
    'helicopter': np.array([0.10,  0.00, -0.95]),
}

def cos(a, b):
    return a @ b / (np.linalg.norm(a) * np.linalg.norm(b))

for a, b in [('cat', 'dog'), ('cat', 'helicopter'), ('king', 'queen'), ('king', 'cat')]:
    print('cos(%-10s, %-10s) = %+.3f' % (a, b, cos(E[a], E[b])))

v = E['king'] - E['man'] + E['woman']
print('\\nking - man + woman =', v.round(2))
for w in sorted(E, key=lambda w: -cos(v, E[w])):
    tag = '  <- input word' if w in ('king', 'man', 'woman') else ''
    print('  %-10s %+.3f%s' % (w, cos(v, E[w]), tag))

U = {w: e / np.linalg.norm(e) for w, e in E.items()}
print('\\nnormalized: plain dot == cosine ->', round(float(U['cat'] @ U['dog']), 3))

# ------------------------- real output -------------------------
# cos(cat       , dog       ) = +0.997
# cos(cat       , helicopter) = -0.986
# cos(king      , queen     ) = +0.842
# cos(king      , cat       ) = +0.693
#
# king - man + woman = [0.92 0.47 0.85]
#   queen      +0.998
#   king       +0.810  <- input word
#   woman      +0.802  <- input word
#   cat        +0.668
#   dog        +0.664
#   man        +0.536  <- input word
#   helicopter -0.560
#
# normalized: plain dot == cosine -> 0.997`,
      annotations: {
        3: 'Three named axes here so you can see the mechanism. In real Word2Vec NO axis has a name — the dimensions are an arbitrary learned basis, and reading meaning off a single one is a beginner mistake.',
        15: 'Cosine = dot product divided by both lengths. Pure angle: magnitude is deliberately discarded.',
        20: 'The analogy is plain vector arithmetic. Subtracting "man" cancels the maleness and the humanness; adding "woman" writes femaleness back in. Royalty survives untouched.',
        23: 'Tagging the inputs is the honest part: the standard analogy benchmark DELETES these three from the candidate list before ranking.',
        27: 'Normalize once, and every later similarity is a bare dot product. This is why vector search indexes store unit vectors.',
        37: 'king at +0.810 and woman at +0.802 sit right behind queen. On real embeddings they frequently rank ABOVE it — which is exactly why the benchmark excludes them.',
      },
    },
    {
      type: 'intuition',
      title: 'king − man + woman: what it actually proves',
      md: `Queen tops the list. The folklore concludes "embeddings do analogies". The precise claim is narrower and more interesting.

- What it shows: the male→female relationship became a consistent **direction** in the space.
- king − man and queen − woman point roughly the same way. That is a property of the geometry, not a lookup.
- So *some* semantic relations are linear offsets, reusable across unseen word pairs. That is the real result.
- It also means one vector can encode several independent attributes along different directions at once.`,
    },
    {
      type: 'math',
      intro: 'The analogy restated as the claim it really makes — parallel difference vectors.',
      latex: [
        'v_{\\text{king}} - v_{\\text{man}} + v_{\\text{woman}} \\approx v_{\\text{queen}} \\iff v_{\\text{king}} - v_{\\text{man}} \\approx v_{\\text{queen}} - v_{\\text{woman}}',
        '\\text{i.e. the gender offset is (approximately) the same vector wherever you stand.}',
      ],
    },
    {
      type: 'note',
      md: `Now the caveats, because interviewers reward them. **One:** the effect is far weaker and more cherry-picked than the demos imply — country→capital and singular→plural hold up reasonably, while most relations do not, and published accuracies sit well under 100% on curated test sets. **Two:** the standard evaluation **excludes the three input words** from the candidate list. Look at the output above: king (+0.810) and woman (+0.802) are right on queen's heels, and on real Word2Vec vectors they routinely outrank it. The famous result quietly depends on deleting them first.`,
    },
    {
      type: 'note',
      md: `**Bias is not a side note — it is a consequence.** Embeddings learn whatever the corpus says, stereotypes included. Word2Vec trained on news text famously completes "man is to computer programmer as woman is to **homemaker**", and places "nurse" nearer female words while "doctor" sits nearer male ones. The algorithm did not invent this; it faithfully reported the text. It matters because these vectors feed résumé screeners, search ranking and recommenders. Debiasing exists — project out a learned "gender direction", rebalance the corpus — but it is **open and imperfect**: the bias often survives in the geometry even after it stops showing up on the obvious tests. Say that plainly; do not claim it is solved.`,
    },
    {
      type: 'note',
      md: `**GloVe** in one line: Stanford, 2014, same destination by a different road — instead of sliding a prediction window, it factorizes the corpus's **global word-word co-occurrence counts**. Count-based rather than predict-based, comparable quality, one training pass over a matrix instead of many over a stream. That sentence is enough for an interview.`,
    },
    {
      type: 'intuition',
      title: 'The killer limitation: "bank" gets exactly one vector',
      md: `Word2Vec learns one vector per word *type*. So "bank" — the river edge and the place holding your money — gets a single vector parked in the awkward average of both senses.

- These are **static embeddings**: the vector never depends on the sentence it appears in.
- Every ambiguous word is a permanent blur. "Apple", "python", "left", "bat" — all smeared.
- **Contextual embeddings** fix it: compute the vector *per occurrence*, from the surrounding words.
- ELMo (bi-LSTM, 2018) → BERT (transformer, 2018) → today's LLMs. In BERT the two "bank"s land in clearly different regions.
- The mechanism doing that is self-attention: mix each token with its neighbours. That is where the GenAI subject picks up.`,
    },
    {
      type: 'intuition',
      title: 'Embeddings were never a word thing',
      md: `The pattern works for anything with IDs and co-occurrence data.

- **Recommenders**: users and items each get a vector; their dot product predicts the rating. The ML subject's *Recommendation Systems* module is this exact idea.
- **Entities and graphs**: nodes in a social or knowledge graph, learned from who connects to whom.
- **Images**: CLIP trains an image encoder and a text encoder into one shared space — photo and caption land next to each other.
- **What the word means today**: say "embedding" now and people assume a sentence or document vector from a transformer.
- Those power semantic search and RAG — embed the corpus once, embed the query, return nearest neighbours. (GenAI subject.)`,
    },
    {
      type: 'intuition',
      title: 'The two knobs you will actually turn',
      md: `How you compare vectors, and how many numbers each one gets.

- **Cosine similarity** is the standard comparison: dot product divided by both lengths. Angle only.
- Why discard magnitude? Vector length mostly tracks how often a word appeared during training, not what it means. Direction carries the semantics.
- So **normalize once to unit length**, then every cosine is a bare dot product — and your entire search index collapses into one matrix multiply.
- **d is a hyperparameter**: 50–300 for classic word vectors, 384–1536 for modern sentence embeddings.
- Too small → distinct senses collide, capacity-starved. Too large → more memory, slower search, and on a small corpus it starts fitting noise. Tune it like any other.`,
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
          text: 'Every pair of distinct words is equally distant, so the encoding carries no semantic information',
          explanation: 'Correct. Any two different one-hots have dot product 0 and Euclidean distance √2 — "cat"/"dog" and "cat"/"helicopter" are indistinguishable.',
        },
        {
          text: 'It cannot represent words outside the vocabulary',
          explanation: 'True but shared with embeddings (both need an UNK token or subwords). It is not what embeddings were invented to fix.',
        },
      ],
      correct: 1,
    },
    {
      question: 'An embedding layer is described as "a lookup table that happens to be trainable". What is the equivalent matrix operation?',
      options: [
        {
          text: 'A dot product between two embedding vectors',
          explanation: 'That is how you compare two embeddings afterwards, not how you retrieve one.',
        },
        {
          text: 'A softmax over the vocabulary',
          explanation: 'Softmax appears at the OUTPUT of a language model, not at the embedding lookup.',
        },
        {
          text: 'A one-hot vector multiplied by the embedding matrix — which selects a row',
          explanation: 'Correct. e_i ᵀ E = row i of E. Frameworks skip the 50,000 multiplications and index directly; the math is unchanged and gradients flow to the touched rows only.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You are training word vectors on a small, specialized corpus full of rare technical terms. Skip-gram or CBOW?',
      options: [
        {
          text: 'Skip-gram — it generates one training example per context word, giving rare words more updates',
          explanation: 'Correct. Skip-gram is the standard choice for small corpora and rare vocabulary; the price is slower training.',
        },
        {
          text: 'CBOW — averaging the context denoises the rare words',
          explanation: 'Averaging actually drowns a rare word inside its context. CBOW is faster and suits large corpora with frequent words.',
        },
        {
          text: 'Neither — both need labelled data',
          explanation: 'Both are self-supervised. The raw text is the only input either one needs.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Negative sampling replaces the full softmax. What does it change about the learning problem?',
      options: [
        {
          text: 'It removes the need for context windows',
          explanation: 'Windows still define what counts as a positive pair — that part is untouched.',
        },
        {
          text: 'It shrinks the embedding dimension',
          explanation: 'd is an independent hyperparameter. Negative sampling changes the objective, not the vector size.',
        },
        {
          text: 'It turns a 50,000-way classification into a binary "is this pair real?" task against K random negatives',
          explanation: 'Correct. One positive plus K ≈ 5–20 negatives with a logistic loss drops the per-step cost from O(V) to O(K) while learning the same vectors.',
        },
      ],
      correct: 2,
    },
    {
      question: 'What does king − man + woman ≈ queen actually demonstrate?',
      options: [
        {
          text: 'That embeddings store a dictionary of word relationships',
          explanation: 'Nothing is stored as a relation. The result falls out of geometry, which is what makes it interesting.',
        },
        {
          text: 'That certain semantic relations became consistent DIRECTIONS in the space, so the same offset works across pairs',
          explanation: 'Correct — equivalently, king − man ≈ queen − woman. And say the caveats: the effect is weaker than folklore, and the benchmark excludes the three input words from the answers.',
        },
        {
          text: 'That the model understands what royalty means',
          explanation: 'It captures co-occurrence regularities. Attributing understanding to a co-occurrence statistic is exactly the overclaim interviewers are listening for.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Word2Vec assigns one vector to "bank". Why is this a problem, and what fixed it?',
      options: [
        {
          text: 'Static embeddings blend all senses into one vector; contextual models (ELMo → BERT → LLMs) compute a vector per occurrence',
          explanation: 'Correct. The river bank and the money bank share a single blurred point until the representation is allowed to depend on the surrounding sentence.',
        },
        {
          text: 'One vector is too small; the fix was raising d to 1024',
          explanation: 'More dimensions cannot help — the vector is still the same one no matter which sense appears. The problem is that it is fixed, not that it is small.',
        },
        {
          text: 'It is not a problem; context is recovered later by the classifier',
          explanation: 'The downstream layer receives an already-blended vector. Information lost at the input is not recoverable there — this limitation is precisely what motivated contextual embeddings.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Why is cosine similarity preferred over raw dot product for comparing embeddings?',
      options: [
        {
          text: 'Cosine is cheaper to compute',
          explanation: 'It is strictly more expensive — a dot product plus two norms. Unless you pre-normalize, in which case it becomes the same cost.',
        },
        {
          text: 'Raw dot product cannot be negative',
          explanation: 'Backwards: dot products can absolutely be negative, and so can cosine (down to −1).',
        },
        {
          text: 'Vector magnitude mostly tracks word frequency, not meaning — cosine compares direction only',
          explanation: 'Correct. Normalizing to unit length once makes cosine a plain dot product afterwards, which is why vector indexes store normalized vectors.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Your embeddings, trained on a corpus of company documents, place "engineer" much closer to male names than female ones. Best characterization?',
      options: [
        {
          text: 'A training bug — the loss must not have converged',
          explanation: 'A perfectly converged model would show this just as clearly. The objective was met; the corpus is what it is.',
        },
        {
          text: 'The embeddings faithfully absorbed a stereotype present in the corpus — a real risk when they feed screening or ranking systems',
          explanation: 'Correct. Debiasing methods (projecting out a bias direction, rebalancing the corpus) exist but are imperfect: the bias often remains recoverable from the geometry.',
        },
        {
          text: 'Harmless — the model only sees numbers',
          explanation: 'The numbers become decisions downstream. "It is just numbers" is the answer that loses the offer.',
        },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain to me why we use embeddings instead of one-hot vectors. Two minutes.',
      answer:
        'Lead with the defect: one-hot gives every word its own axis, so any two distinct words have dot product 0 and identical distance — "cat" is as far from "dog" as from "helicopter". The representation encodes identity and nothing else, in 50,000 dimensions of almost all zeros. Embeddings replace that with a dense learned vector (say 300 numbers) where geometric closeness means semantic relatedness, so the network gets a useful starting representation instead of an index. Add the two practical wins: the input layer shrinks by orders of magnitude, and similar words share statistical strength — a model that has seen "dog" generalizes to "puppy" it barely saw.',
      isCaseBased: false,
    },
    {
      question: 'Is an embedding layer a matrix multiplication or a lookup? Answer carefully.',
      answer:
        'Both — the lookup is an optimization of the multiplication. Formally the input is a one-hot e_i and the layer computes e_iᵀE, which by construction selects row i of E. Doing that literally means V multiply-adds to fetch d numbers, so every framework implements it as an index into the rows. The consequences worth naming: the layer is trainable like any weight matrix; the gradient is sparse (only the rows appearing in the batch receive updates, which is why sparse optimizers and sparse gradients exist for embedding tables); and the parameter count is V×d, which for a 50k vocabulary at d=768 is ~38M — frequently the largest single tensor in a small model.',
      isCaseBased: false,
    },
    {
      question: 'Skip-gram vs CBOW: mechanics, and when you would pick each.',
      answer:
        'Same sliding window, opposite prediction direction. Skip-gram takes the centre word and predicts each context word, so a window of size 5 yields up to 10 training examples — more gradient updates per occurrence, which is why it does better on rare words and small corpora, at higher training cost. CBOW averages the context vectors and predicts the centre word, producing one example per window — faster and smoother, and the averaging acts like denoising, which suits very large corpora dominated by frequent words. Default recommendation: skip-gram with negative sampling, since quality usually matters more than training time at word-vector scale. Naming the examples-per-window difference is the part that shows you understand rather than memorized.',
      isCaseBased: false,
    },
    {
      question: 'Why does negative sampling exist, and what exactly does it change about the loss?',
      answer:
        'The naive skip-gram objective is a softmax over the whole vocabulary: the denominator sums exp(v_wᵀv_c) over all V words, so every window costs O(V) and touches every output vector. At V = 50k across billions of windows that is unaffordable. Negative sampling reframes the problem as binary classification: given a pair, is it a real co-occurrence? Maximize log σ(v_oᵀv_c) for the observed pair and log σ(−v_kᵀv_c) for K sampled fakes, K about 5–20 (larger for small datasets). Cost per step becomes O(K). Two details worth adding: negatives come from the unigram distribution raised to the 0.75 power — flattening it so common words do not monopolize the negatives and rare junk does not dominate either — and frequent words are subsampled out of the positives too. Related alternative: hierarchical softmax, O(log V) via a Huffman tree, less used today.',
      isCaseBased: false,
    },
    {
      question: 'Case: a colleague demos king − man + woman ≈ queen and concludes the model "understands gender". Push back rigorously without being dismissive.',
      answer:
        'Grant the real result first: it shows the male→female relation became an approximately consistent direction in the space — king − man ≈ queen − woman — which genuinely means the geometry encodes reusable relational structure, not just per-word identity. Then apply three corrections. (1) Selection: the effect holds well for a few relation families (country→capital, singular→plural) and poorly for most; published analogy accuracies on curated sets are far from perfect and the viral examples are cherry-picked. (2) Methodology: the standard evaluation excludes the three input words from the candidate list, and without that exclusion the inputs themselves — typically the b or c term — often rank first, so part of the famous result is an artifact of the scoring rule. (3) Semantics: this is a co-occurrence regularity, not understanding; the same mechanism that produces "king→queen" produces "programmer→homemaker", which is the same geometry telling us about the corpus rather than about the world. Land on: strong evidence of linear relational structure, weak evidence of anything more.',
      isCaseBased: true,
    },
    {
      question: 'Case: you ship a résumé-ranking feature built on pretrained word embeddings. Legal asks whether it can discriminate. Walk through your answer and your plan.',
      answer:
        'Answer honestly: yes, it can, and probably does by default. Embeddings absorb the statistics of their corpus, which includes occupational gender and ethnic associations — the documented ones include "nurse" near female terms and "programmer" near male terms, plus name-based ethnicity associations. The ranking model never sees a protected attribute and still uses it, because the attribute is recoverable from the geometry of ordinary words. Plan: (1) Measure before mitigating — WEAT-style association tests, plus a direct audit swapping names/gendered terms on otherwise identical résumés and checking rank deltas. (2) Mitigate at several levels: drop or neutralize name and pronoun features, apply a debiasing projection along an estimated bias direction, fine-tune on in-domain data with balanced sampling. (3) State the ceiling: hard-debiasing methods are known to hide bias from the obvious tests while leaving clusters recoverable, so treat them as reduction, not removal. (4) Add process controls — human review, ongoing outcome monitoring by group, a documented model card. The tradeoff to name explicitly: aggressive debiasing costs some ranking quality, and that is the correct trade to make here.',
      isCaseBased: true,
    },
    {
      question: 'What is the single biggest limitation of Word2Vec, and how did the field fix it?',
      answer:
        'One vector per word type — they are static. "Bank" gets one point in space that averages the river sense and the finance sense, and no downstream layer can unmix what was blended at the input. Fix: make the representation a function of the sentence. ELMo (2018) ran a bi-LSTM and used its internal states as per-occurrence vectors; BERT replaced recurrence with self-attention so every token is re-encoded as a weighted mix of the whole sentence; modern LLMs are the same idea at scale. In a contextual model, the two "bank" occurrences occupy visibly different regions. Worth adding: static embeddings did not become useless — they are still fast, tiny, and fine for many retrieval and feature-engineering jobs where per-occurrence context does not pay for itself.',
      isCaseBased: false,
    },
    {
      question: 'GloVe vs Word2Vec in the shortest honest comparison you can give.',
      answer:
        'Word2Vec is predict-based and local: slide a window, train a shallow model to predict centre from context or vice versa, learn from a stream of examples. GloVe is count-based and global: build the word-word co-occurrence matrix over the whole corpus, then factorize it with a weighted least-squares objective on log co-occurrence counts. The two land in similar quality territory and both produce static vectors with the same linear-analogy behaviour; GloVe exploits global statistics in one pass, Word2Vec streams and scales more naturally to incremental data. In practice today, the choice between them matters far less than the choice between either and a transformer sentence encoder.',
      isCaseBased: false,
    },
    {
      question: 'How do you choose the embedding dimension d, and what goes wrong at each extreme?',
      answer:
        'Empirically, by validation on the downstream task — there is no formula worth trusting. Useful priors: 50–300 for classic word vectors, and 384–1536 for modern transformer sentence embeddings, with the upper end mostly serving retrieval quality at higher storage cost. Too small: not enough capacity to separate senses and relations, so distinct concepts collide and downstream accuracy plateaus low — the underfitting signature. Too large: memory and index size grow linearly (V×d parameters, and every stored document vector grows too), similarity search slows, and on a small corpus the extra capacity fits noise and co-occurrence accidents. Two extra points that land well: the marginal gain per dimension flattens quickly, so the curve is usually cheap to explore; and for retrieval, dimension interacts with your ANN index and quantization budget, so the right d is partly an infrastructure decision.',
      isCaseBased: false,
    },
    {
      question: 'Case: your semantic search returns garbage. Long documents dominate the results regardless of query, and near-duplicates rank far apart. Debug it.',
      answer:
        'The two symptoms point at two different bugs, so separate them. Long documents dominating suggests you are ranking by raw dot product on unnormalized vectors — magnitude correlates with length and token count, so long chunks win on norm rather than on relevance. Fix: normalize every vector to unit length and rank by cosine (equivalently, dot product on normalized vectors). Near-duplicates ranking far apart suggests an encoding inconsistency: query and documents embedded by different models or different model versions, an asymmetric model (query-encoder vs passage-encoder) used symmetrically, a missing instruction prefix that some models require, or a stale index built before a model upgrade. Check by embedding the same string through both paths and confirming cosine ≈ 1.0. Then look at chunking — chunks that span unrelated topics produce averaged, meaningless vectors. Order of work: verify the encoder identity end to end, then normalization, then chunk boundaries, then consider hybrid retrieval with BM25 since pure dense retrieval is weak on exact rare terms and identifiers.',
      isCaseBased: true,
    },
    {
      question: 'Beyond words — give three non-NLP uses of embeddings and say what plays the role of "context".',
      answer:
        'Recommenders: users and items each get a learned vector and the dot product predicts the rating or click; the "context" is the interaction matrix — who consumed what — so items consumed by similar users end up near each other. Graphs: nodes in a social or knowledge graph get vectors learned from random walks or link structure (node2vec, knowledge-graph embeddings); the context is the neighbourhood a walk visits, which is literally the distributional hypothesis on a graph. Multimodal: CLIP trains an image encoder and a text encoder jointly with a contrastive loss so a photo and its caption land near each other in one shared space, enabling zero-shot classification by comparing an image against text prompts; here the context is the paired caption. The unifying statement worth saying out loud: any time you have discrete entities plus a signal about which ones co-occur, you can learn an embedding — the words case is just the most famous instance.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'What is wrong with one-hot encoding for words?', back: 'Every pair of distinct words is equidistant (dot product 0, distance √2). It encodes identity and zero meaning, in V dimensions of near-total zeros.' },
    { front: 'Definition of an embedding', back: 'A dense, low-dimensional, LEARNED vector per token, where geometric closeness means semantic relatedness.' },
    { front: 'Embedding layer: lookup or matmul?', back: 'Both — e_iᵀE selects row i of E. Implemented as an indexed lookup for speed; still trainable, with sparse gradients on touched rows only.' },
    { front: 'Distributional hypothesis', back: '"You shall know a word by the company it keeps." Similar neighbourhoods → similar vectors. This is the entire Word2Vec training signal.' },
    { front: 'Skip-gram vs CBOW', back: 'Skip-gram: centre → context, more examples per window, better on rare words/small corpora, slower. CBOW: averaged context → centre, faster, better on frequent words/large corpora.' },
    { front: 'Negative sampling in one line', back: 'Replace the V-way softmax with a binary "is this pair real?" classifier: 1 positive vs K≈5–20 random negatives, drawn from unigram^0.75. O(V) → O(K).' },
    { front: 'What the king−man+woman analogy really shows', back: 'Some semantic relations became consistent DIRECTIONS (king−man ≈ queen−woman). Caveats: weaker and more cherry-picked than folklore, and the benchmark excludes the three input words.' },
    { front: 'Bias in embeddings', back: 'They absorb corpus stereotypes (doctor/nurse gender associations). Debiasing exists but is imperfect — bias stays recoverable from the geometry. Never claim it is solved.' },
    { front: 'Static vs contextual embeddings', back: 'Static (Word2Vec/GloVe): one vector per word type, so "bank" blends both senses. Contextual (ELMo → BERT → LLMs): a different vector per occurrence.' },
    { front: 'Why cosine, and why normalize?', back: 'Magnitude tracks training frequency, not meaning — cosine compares direction only. Normalize to unit length once, and cosine becomes a plain dot product.' },
  ],
  mindmapMarkdown: `- Embeddings: Meaning as Vectors
  - Problem: one-hot
    - 50,000 dims, cat–dog = cat–helicopter, zero meaning
  - The embedding idea
    - dense, low-dim, LEARNED
    - closeness = relatedness (dot product)
    - layer = trainable lookup table
    - one-hot × E = row i, indexed for speed
  - Word2Vec
    - distributional hypothesis (Firth)
    - skip-gram: centre → context (rare words)
    - CBOW: context → centre (frequent, fast)
    - negative sampling: binary vs K fakes
    - GloVe: count-based global co-occurrence
  - Analogy arithmetic
    - king − man + woman ≈ queen
    - relations become DIRECTIONS
    - caveats: cherry-picked, inputs excluded
  - Bias
    - absorbs corpus stereotypes (doctor/nurse); debiasing imperfect
  - Static vs contextual
    - static: "bank" gets ONE blended vector
    - ELMo → BERT → LLMs: one vector per occurrence
  - Beyond words
    - users / items in recsys; entities, graphs
    - CLIP: image + text, one shared space
    - sentence vectors → search, RAG
  - Practical knobs
    - cosine: angle not length; normalize once → dot product
    - d: 50–300 classic, 384–1536 modern`,
}

export default m
