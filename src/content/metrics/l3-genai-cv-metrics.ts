import type { Module } from '../types'

const m: Module = {
  id: 'metrics-l3-genai-cv-metrics',
  subjectId: 'metrics',
  level: 3,
  title: 'Text Generation Metrics: Perplexity, BLEU and ROUGE',
  whyItMatters:
    'A model writes one sentence, a human wrote a different one, and both are correct. Every metric you have met puts predictions in boxes and counts them; text generation has no boxes, and these three are what the field uses instead.',
  assumes: [
    'You have met cross-entropy: minus the log of the probability given to the correct answer',
    'You know precision and recall',
  ],
  estMinutes: 22,
  sections: [
    {
      type: 'intuition',
      title: 'Two answers, both correct',
      md: `"The cat sat on the mat" and "A cat was sitting on the rug" describe the same picture. Exact-match accuracy scores the second one zero.

There are two ways out, and they measure different things.

**Perplexity** ignores the reference entirely and asks how surprised the model was by real text — a property of the model, computable on any corpus, with no human answer needed. **BLEU and ROUGE** compare a generated sentence to one or more human ones by counting overlapping word sequences. The first tells you whether the model has learned the language; the second whether this particular output resembles what a person wrote.`,
    },
    {
      type: 'math',
      intro:
        'Perplexity is cross-entropy exponentiated back out of log space. Written in bits (log base 2) the exponent base is 2; in nats it is e. The p(w) are the probabilities the model assigned to the words that actually appeared.',
      latex: [
        'H = -\\frac{1}{N}\\sum_{i=1}^{N} \\log_2 p(w_i) \\qquad \\mathrm{PPL} = 2^{H}',
      ],
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Perplexity from four probabilities',
      code: `import math

def ppl(probs):
    h = -sum(math.log2(p) for p in probs) / len(probs)
    return h, 2 ** h

h, p = ppl([0.5, 0.25, 0.125, 0.5])
print('cross-entropy = %.4f bits   perplexity = %.4f' % (h, p))

for name, probs in [('confident and right', [0.9, 0.9, 0.9, 0.9]),
                    ('unsure throughout  ', [0.25, 0.25, 0.25, 0.25]),
                    ('one confident error', [0.9, 0.9, 0.9, 0.01])]:
    print('%s -> ppl %.4f' % (name, ppl(probs)[1]))

# ---- real output ----
# cross-entropy = 1.7500 bits   perplexity = 3.3636
# confident and right -> ppl 1.1111
# unsure throughout   -> ppl 4.0000
# one confident error -> ppl 3.4223`,
      annotations: {
        4: 'Average the log-probabilities, then negate. Dividing by N is what makes the number comparable between a 10-word and a 10,000-word corpus.',
        8: '1.75 bits of surprise per word becomes a perplexity of 3.3636. The exponential is not decoration — it puts the number back into units of "words".',
        13: 'Four probabilities of 0.25 give a perplexity of exactly 4.0000. That is the reading: perplexity is the effective number of equally likely choices the model was picking between at each step.',
        14: 'Three excellent predictions plus one 0.01 took perplexity from 1.1111 to 3.4223 — tripled by a single token. Log space punishes confident mistakes far harder than it rewards confident hits.',
      },
    },
    {
      type: 'note',
      label: 'What perplexity cannot be compared across',
      md: `Perplexity is only meaningful **against the same tokenizer and the same test set**. A model that splits words into sub-word pieces predicts more, easier tokens, so it reports a lower perplexity than a word-level model that is genuinely better. Cross-paper perplexity comparisons are usually meaningless for this reason.

It also says nothing about whether generated text is *good*. A model can have excellent perplexity and still produce fluent, confident, factually wrong sentences — perplexity measures the fit to a distribution, not truth, helpfulness, or coherence past a few words.`,
    },
    {
      type: 'intuition',
      title: 'n-grams, and BLEU as clipped precision',
      md: `An **n-gram** is a run of n consecutive words. "the cat sat" contains the 2-grams "the cat" and "cat sat".

**BLEU** asks a precision question: of the n-grams I generated, how many appear in the human reference? Precision, because it is counting over what the model produced.

Raw precision breaks in two obvious ways, so BLEU carries two repairs. **Clipping** caps each n-gram's credit at how many times it appears in the reference, killing the repeat-a-common-word cheat. The **brevity penalty** multiplies the score down when the candidate is shorter than the reference, killing the emit-two-safe-words cheat.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'n-gram counting, clipped, with both cheats tested',
      code: `from collections import Counter

def ngrams(s, n):
    w = s.split()
    return [tuple(w[i:i+n]) for i in range(len(w) - n + 1)]

def clipped(cand, ref, n):
    c, r = Counter(ngrams(cand, n)), Counter(ngrams(ref, n))
    return sum(min(v, r[g]) for g, v in c.items()), sum(c.values())

ref = 'the cat sat on the mat'
for cand in ['the cat sat on a mat', 'the the the the the the']:
    m, t = clipped(cand, ref, 1)
    print('%-24s clipped 1-gram = %d/%d = %.4f' % (cand, m, t, m / t))

# ---- real output ----
# the cat sat on a mat     clipped 1-gram = 5/6 = 0.8333
# the the the the the the  clipped 1-gram = 2/6 = 0.3333`,
      annotations: {
        4: 'A sliding window of width n over the words. A 6-word sentence yields 6 unigrams and 5 bigrams.',
        8: 'min(v, r[g]) is the clip. "the" appears 6 times in the cheat sentence but only twice in the reference, so it earns credit twice and no more.',
        18: 'Without clipping the cheat scores 6/6 = 1.0 — a perfect unigram precision for a sentence that says nothing. With it, 0.3333.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Full BLEU, and the brevity penalty doing its job',
      code: `def bleu(cand, ref):
    m1, t1 = clipped(cand, ref, 1)
    m2, t2 = clipped(cand, ref, 2)
    lc, lr = len(cand.split()), len(ref.split())
    bp = 1.0 if lc > lr else math.exp(1 - lr / lc)
    if m1 == 0 or m2 == 0:
        return bp, 0.0
    return bp, bp * math.sqrt((m1 / t1) * (m2 / t2))

for cand in ['the cat sat on a mat', 'the cat',
             'the cat sat on the mat quietly in the sun']:
    bp, score = bleu(cand, ref)
    print('%-42s BP=%.4f  BLEU-2=%.4f' % (cand, bp, score))

# ---- real output ----
# the cat sat on a mat                       BP=1.0000  BLEU-2=0.7071
# the cat                                    BP=0.1353  BLEU-2=0.1353
# the cat sat on the mat quietly in the sun  BP=1.0000  BLEU-2=0.5774`,
      annotations: {
        5: 'exp(1 − ref_len / cand_len), applied only when the candidate is shorter. Length 2 against reference length 6 gives exp(−2) = 0.1353.',
        7: 'The geometric mean of the n-gram precisions — so a zero at any n makes the whole score zero. A candidate with no matching bigram cannot be rescued by perfect unigrams.',
        16: '"the cat" has perfect precision at both n: every unigram and its one bigram appear in the reference. Without the brevity penalty it would score 1.0000; with it, 0.1353.',
        17: 'Ten words for a six-word reference and BLEU falls to 0.5774. There is no penalty for being too long — the drop is entirely because the four extra words dilute precision.',
      },
    },
    {
      type: 'intuition',
      title: 'ROUGE flips the question',
      md: `BLEU asks how much of what the model wrote appears in the reference. **ROUGE** asks how much of the reference survives in what the model wrote.

That is precision versus recall over the same overlap count — the same numerator, a different denominator. BLEU divides by the candidate's length; ROUGE-N divides by the reference's.

Which one you want follows from the task. Translation wants precision, because a translation that adds material is wrong. Summarisation wants recall, because a summary that drops the key fact is wrong. The two can point in opposite directions on the same output.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Same overlap, opposite verdicts',
      code: `def scores(cand, ref):
    m, t = clipped(cand, ref, 1)
    prec = m / t
    rec = m / len(ref.split())
    f1 = 2 * prec * rec / (prec + rec)
    return prec, rec, f1

for cand in ['the cat sat on a mat',
             'the cat sat on the mat quietly in the sun']:
    p, r, f = scores(cand, ref)
    print('%-42s BLEU-1=%.4f  ROUGE-1 r=%.4f  f1=%.4f' % (cand, p, r, f))

# ---- real output ----
# the cat sat on a mat                       BLEU-1=0.8333  ROUGE-1 r=0.8333  f1=0.8333
# the cat sat on the mat quietly in the sun  BLEU-1=0.6000  ROUGE-1 r=1.0000  f1=0.7500`,
      annotations: {
        4: 'Identical numerator m in both lines. Only the denominator changes — candidate length for precision, reference length for recall.',
        16: 'The long candidate contains the entire reference, so ROUGE-1 recall is a perfect 1.0000 while BLEU-1 falls to 0.6000. A summariser tuned on ROUGE alone learns to be verbose, which is exactly the failure mode ROUGE-L and F1 exist to temper.',
      },
    },
    {
      type: 'note',
      label: 'The variants, and why nobody trusts any of them alone',
      md: `**ROUGE-L** uses the longest common subsequence instead of fixed-length n-grams, so word order matters without demanding contiguity. **ROUGE-N** is the plain n-gram version above.

The shared blind spot is that all three count **surface overlap**. "The film was terrible" and "The film was terrific" share three of four unigrams. A correct paraphrase that reuses no vocabulary scores near zero. BLEU famously correlates poorly with human judgement on individual sentences, and is only defensible as a corpus-level signal.

So modern practice uses them as cheap regression tests and puts the real weight on embedding-based scores like BERTScore, on model-as-judge evaluations, and on human preference — with BLEU and ROUGE kept because they are deterministic, free, and catch a model that has broken outright.`,
    },
  ],
  quiz: [
    {
      question: 'Four probabilities of 0.25 gave a perplexity of exactly 4.0. What does that mean?',
      options: [
        { text: 'The model made four predictions', explanation: 'The count of predictions is divided out by the 1/N.' },
        { text: 'The model was effectively choosing between 4 equally likely options at each step', explanation: 'Correct — that is the standard reading of perplexity, and why the exponential is applied.' },
        { text: 'The model was 25% accurate', explanation: 'Perplexity is not an accuracy; it uses the probability assigned to the true word.' },
        { text: 'Cross-entropy was 4 bits', explanation: 'It was 2 bits; 2² = 4.' },
      ],
      correct: 1,
    },
    {
      question: 'Three predictions at 0.9 plus one at 0.01 gave perplexity 3.4223, against 1.1111 for four at 0.9. What does that show?',
      options: [
        { text: 'Perplexity is unstable and should not be used', explanation: 'The behaviour is by design, not instability.' },
        { text: 'Log space punishes confident mistakes far harder than it rewards confident hits — one token tripled the score', explanation: 'Correct. −log(0.01) is 6.64 bits against 0.15 for a 0.9.' },
        { text: 'The average was computed wrongly', explanation: 'It is the correct arithmetic mean of the log-probabilities.' },
        { text: 'Four tokens is too few to measure', explanation: 'True in practice, but the asymmetry shown is real at any length.' },
      ],
      correct: 1,
    },
    {
      question: 'Why can you not compare perplexity numbers across two papers?',
      options: [
        { text: 'Perplexity depends on the random seed', explanation: 'It is deterministic given a model and a test set.' },
        { text: 'It depends on the tokenizer and test set — sub-word models predict more, easier tokens and so report lower perplexity regardless of quality', explanation: 'Correct, which is why cross-paper perplexity comparisons are usually meaningless.' },
        { text: 'Different papers use different log bases', explanation: 'A base change is a fixed rescaling and could be corrected for; the tokenizer cannot.' },
        { text: 'Perplexity is unbounded above', explanation: 'It is, but that does not prevent comparison on its own.' },
      ],
      correct: 1,
    },
    {
      question: '"the the the the the the" scored 6/6 = 1.0 unclipped and 2/6 = 0.3333 clipped. What is clipping doing?',
      options: [
        { text: 'Removing duplicate words from the candidate', explanation: 'The words stay; only their credit is capped.' },
        { text: 'Capping each n-gram\'s credit at how many times it appears in the reference — "the" appears twice, so it earns credit twice', explanation: 'Correct. Without it, repeating a common word is a perfect-precision cheat.' },
        { text: 'Limiting the score to at most 1.0', explanation: 'Precision is already bounded by 1 without clipping.' },
        { text: 'Ignoring stopwords', explanation: 'BLEU has no stopword list; clipping is count-based.' },
      ],
      correct: 1,
    },
    {
      question: '"the cat" had perfect n-gram precision but scored BLEU-2 = 0.1353. Why?',
      options: [
        { text: 'The bigram precision was zero', explanation: 'Its one bigram "the cat" is in the reference, so precision is 1.0.' },
        { text: 'The brevity penalty exp(1 − 6/2) = 0.1353 multiplied the perfect precision down', explanation: 'Correct — it exists precisely to kill the emit-two-safe-words cheat.' },
        { text: 'BLEU requires at least four words', explanation: 'It is defined for any length; short candidates are penalised, not rejected.' },
        { text: 'Clipping removed the matches', explanation: 'Both matches survive clipping.' },
      ],
      correct: 1,
    },
    {
      question: 'A candidate scored BLEU-1 = 0.6 and ROUGE-1 recall = 1.0. What kind of output is it?',
      options: [
        { text: 'A short output missing most of the reference', explanation: 'That would give high precision and low recall — the reverse.' },
        { text: 'A long output containing the whole reference plus extra material — so a ROUGE-only objective rewards verbosity', explanation: 'Correct: ten words for a six-word reference, all six present.' },
        { text: 'A paraphrase using different vocabulary', explanation: 'A paraphrase would score low on both.' },
        { text: 'An exact match', explanation: 'An exact match gives 1.0 on both.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'What is perplexity, in plain terms?',
      answer:
        'It is the average surprise of the model on real text, exponentiated back into units you can read. Take minus the average log-probability the model assigned to the words that actually appeared — that is cross-entropy — then raise 2 to it. The useful reading is the effective number of equally likely options the model was choosing between at each step: four probabilities of 0.25 give a perplexity of exactly 4.0. Lower is better, and the important property is that it needs no reference text, only a corpus, so it measures the model rather than one particular output.',
      isCaseBased: false,
    },
    {
      question: 'BLEU versus ROUGE — when would you use each?',
      answer:
        'They are precision and recall over the same overlap count, with different denominators. BLEU divides matching n-grams by the candidate length, so it asks how much of what the model wrote is justified; ROUGE-N divides by the reference length, so it asks how much of the reference survived. Translation wants BLEU, because a translation that adds material is wrong. Summarisation wants ROUGE, because a summary that drops the key fact is wrong. They genuinely diverge — a ten-word candidate containing a six-word reference scored BLEU-1 0.6 and ROUGE-1 recall 1.0 — which is why summarisation systems tuned on ROUGE alone drift toward verbosity.',
      isCaseBased: false,
    },
    {
      question: 'Why does BLEU need a brevity penalty?',
      answer:
        'Because precision alone rewards saying less. Emit only the words you are sure about and every one of them matches, giving perfect precision for an output that conveys nothing — "the cat" against "the cat sat on the mat" has precision 1.0 at both unigram and bigram level. The brevity penalty, exp(1 − ref_len/cand_len) applied when the candidate is shorter, dragged that to 0.1353. It is BLEU\'s only recall-flavoured component, which is also its weakness: there is no corresponding penalty for being too long, so length only hurts through dilution of precision.',
      isCaseBased: true,
    },
    {
      question: 'Your model\'s BLEU dropped but the outputs look better to reviewers. What is going on?',
      answer:
        'Almost certainly that the model started paraphrasing. BLEU counts surface n-gram overlap, so an output that expresses the reference correctly in different words scores near zero — a fluent paraphrase and a nonsense sentence can be indistinguishable to it. I would check three things: whether the vocabulary shifted while meaning held, whether output length moved enough for the brevity penalty to bite, and whether there is only one reference, since single-reference BLEU punishes any legitimate alternative phrasing hard. Then I would confirm with a metric that does not depend on exact words — BERTScore or a model-as-judge pass — and if that agrees with the reviewers, trust them over BLEU.',
      isCaseBased: true,
    },
    {
      question: 'How do you evaluate an LLM properly?',
      answer:
        'In layers, because no single number covers it. Perplexity on held-out text as a cheap training-health signal, with the caveat that it is only comparable within one tokenizer. Task benchmarks for capability — MMLU, HumanEval, GSM8K and so on, with contamination checked, since a benchmark in the training data measures nothing. Then human preference or a strong model as judge on the actual use case, which is what correlates with quality. Plus targeted safety and factuality evaluations, and offline-to-online agreement checks before believing any of it. BLEU and ROUGE I would keep only as deterministic regression tests that catch a model breaking outright.',
      isCaseBased: false,
    },
    {
      question: 'Perplexity improved but the generations got worse. Explain.',
      answer:
        'Perplexity measures fit to the distribution of the evaluation corpus, and that is not the same as generation quality. Several things produce this: the model got better at high-frequency, low-information tokens, which dominate the average; the evaluation corpus does not resemble what users actually ask; or generation is failing for reasons perplexity cannot see, like a decoding strategy that degenerates into repetition, or loss of long-range coherence that a per-token metric averages away. Perplexity is a next-token metric — a model can be excellent at every individual step and still produce a paragraph that goes nowhere.',
      isCaseBased: true,
    },
    {
      question: 'What is the fundamental limitation shared by BLEU and ROUGE?',
      answer:
        'They count surface overlap, so they conflate wording with meaning in both directions. "The film was terrible" and "The film was terrific" share three of four unigrams and score highly despite being opposites; a correct paraphrase that reuses no vocabulary scores near zero. That is why BLEU correlates poorly with human judgement at the sentence level and is only defensible aggregated over a corpus. The replacements — BERTScore, BLEURT, COMET — compare embeddings rather than tokens, so paraphrase survives, and model-as-judge goes further still. BLEU and ROUGE persist because they are deterministic, free, and unarguable, which makes them good regression tests and bad quality measures.',
      isCaseBased: false,
    },
    {
      question: 'How would you evaluate a RAG system?',
      answer:
        'Separately at each stage, because a single end-to-end score cannot tell you which half is broken. Retrieval first, with ranking metrics — recall@k for whether the needed document is present at all, and NDCG or MRR for whether it is near the top. Then grounding: does the generated answer actually follow from the retrieved passages, which is a faithfulness check usually done with a judge model against the retrieved context. Then answer quality against a reference where one exists. The diagnostic value is in the split — a system that retrieves perfectly and hallucinates anyway needs a different fix from one whose retriever never surfaces the right chunk.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'Perplexity', back: '2^H where H is the average negative log2 probability of the true words. Reads as the effective number of equally likely choices per step.' },
    { front: 'The 0.25 example', back: 'Four probabilities of 0.25 give perplexity exactly 4.0000 — the model was choosing between 4 equal options.' },
    { front: 'Confident mistakes', back: 'Three 0.9s plus one 0.01 took perplexity 1.1111 → 3.4223. Log space punishes a confident error far harder than it rewards a confident hit.' },
    { front: 'Perplexity is not comparable across…', back: 'Tokenizers and test sets. Sub-word models predict more, easier tokens and report lower perplexity regardless of quality.' },
    { front: 'BLEU clipping', back: 'Cap each n-gram at its reference count. "the the the the the the" scores 6/6 = 1.0 unclipped, 2/6 = 0.3333 clipped.' },
    { front: 'Brevity penalty', back: 'exp(1 − ref_len/cand_len) when shorter. "the cat" has perfect precision but BLEU-2 = 0.1353. No penalty exists for being too long.' },
    { front: 'BLEU vs ROUGE', back: 'Same numerator, different denominator. BLEU / candidate length (precision, translation). ROUGE / reference length (recall, summarisation).' },
    { front: 'The shared blind spot', back: 'Surface overlap only. "terrible" vs "terrific" share 3/4 unigrams; a correct paraphrase scores near zero. Use them as regression tests, not quality measures.' },
  ],
  mindmapMarkdown: `- Text generation metrics
  - The problem
    - two different sentences, both correct
    - exact match scores the paraphrase zero
  - Perplexity
    - 2^(average -log2 p of true words)
    - four 0.25s -> exactly 4.0
    - effective number of equal choices per step
    - one 0.01 among three 0.9s: 1.1111 -> 3.4223
    - NOT comparable across tokenizers
    - says nothing about truth or coherence
  - BLEU (precision)
    - clipped n-gram overlap / candidate length
    - clipping: "the" x6 -> credit twice, 1.0 -> 0.3333
    - brevity penalty exp(1 - lr/lc): "the cat" -> 0.1353
    - geometric mean, so any zero n kills it
  - ROUGE (recall)
    - same overlap / reference length
    - long candidate: BLEU-1 0.6 but ROUGE-1 r 1.0
    - ROUGE-L uses longest common subsequence
    - rewards verbosity if used alone
  - Shared blind spot
    - surface overlap only
    - "terrible" vs "terrific" = 3/4 unigrams
    - BERTScore / judge models / human preference`,
}

export default m
