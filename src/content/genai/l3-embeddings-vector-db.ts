import type { Module } from '../types'

const m: Module = {
  id: 'genai-l3-embeddings-vector-db',
  subjectId: 'genai',
  level: 3,
  title: 'Embeddings, Vector Databases & Semantic Search',
  whyItMatters:
    'Every RAG system, every "chat with your docs" demo, every product search box that understands paraphrase runs on this one pipeline: chunk, embed, index, retrieve. It is also the part candidates fake worst — they can name Pinecone but cannot say what a chunk should be, why the index is model-specific, or why adding BM25 beats every other tuning knob. Get this module right and you can both build the thing and defend it in an interview.',
  estMinutes: 50,
  sections: [
    {
      type: 'intuition',
      title: 'From one word to one paragraph',
      md: `The DL subject's *Embeddings: Meaning as Vectors* module gave every **word** a vector. That is 2013. This module is about giving a whole **passage** one vector, and the retrieval machinery built on top of it.

- Feed a passage to a transformer encoder. You get one vector per token — contextual, but n of them.
- Collapse them into a single vector: **mean pooling** (average all token vectors) or take the **CLS token** (a special prepended token whose final vector is trained to summarise the sequence).
- That one vector is the passage's address in meaning-space. Two passages saying the same thing in different words land near each other.
- Store one vector per passage, embed the user's question the same way, return the nearest passages. That is semantic search, complete.
- Nothing here needs keywords to overlap. "How do I get my money back?" finds a document that only ever says "refund".`,
    },
    {
      type: 'note',
      md: `**The trap: a raw LLM does not give you good sentence embeddings.** You can mean-pool GPT-2's hidden states and get a vector — it will retrieve badly. A language model is trained to predict the next token, so its states are optimized for *what comes next*, not for *are these two passages about the same thing*. Embedding models are trained on a different objective: **contrastive learning** — pull true (query, passage) pairs together, push random ones apart, usually with the other items in the batch as the negatives. Same architecture, completely different training signal. This is why you use a purpose-built encoder (E5, BGE, GTE, \`text-embedding-3\`, sentence-transformers) and not "the LLM I already have".`,
    },
    {
      type: 'intuition',
      title: 'How many numbers per passage?',
      md: `Embedding dimension is the first knob you will be asked about. The common sizes are not arbitrary — they are the model families people actually ship.

- **384** — small sentence-transformer models (MiniLM class). Fast, tiny index, runs on CPU. Quality is genuinely fine for narrow domains.
- **768** — base-size encoders. The default middle.
- **1536 / 3072** — large hosted models (OpenAI \`text-embedding-3-small\` / \`-large\`). Best quality, biggest bill.
- Cost is linear in d and it is paid **three times**: storage, RAM for the index, and every distance computation at query time. One million passages at d=1536 in float32 is about 6 GB before the index overhead.
- Bigger is not automatically better on your data — a 384-d model fine-tuned on your domain routinely beats a generic 1536-d one. Measure recall@k on your own queries before paying for dimensions.
- Modern trick worth naming: **Matryoshka embeddings** are trained so the first 256 or 512 dimensions are usable on their own — you can truncate the vector and trade a little quality for a much smaller index.`,
    },
    {
      type: 'note',
      md: `**Asymmetric search.** A question and a document are not the same kind of text — "how do I reset my password?" is short and interrogative, the passage answering it is long and declarative. So many models treat them differently: E5 and BGE want literal prefixes (\`query: …\` and \`passage: …\`), instruction-tuned models want a task instruction on the query only, and dense-retrieval systems like DPR go all the way to **two separate encoders** — one for queries, one for documents, trained jointly. Two rules follow. One: whatever prefix or encoder the model documents, use it on *both* sides consistently — mixing them silently destroys recall and is the single most common "my search returns garbage" bug. Two: symmetric tasks (find duplicate tickets, cluster similar sentences) are the case where both sides genuinely are the same kind of text — that is a different model choice, not the same one used loosely.`,
    },
    {
      type: 'intuition',
      title: 'Cosine similarity, and why the index stores unit vectors',
      md: `You have a query vector and a million document vectors. How do you score them?

- **Cosine similarity**: the angle between two vectors, ignoring their lengths. Range −1 to 1; in practice text embeddings crowd into roughly 0 to 1.
- Why ignore length? Magnitude mostly tracks passage length and token count, not topic. A long rambling document has a big vector and would win on raw dot product **just for being long** — you will see this happen in the code below.
- Cosine = dot product divided by both norms. That is the math subject's *Vectors & the Dot Product (= Similarity)* module, unchanged.
- Now the move every vector database makes: **normalize once, at index time**. After normalization both norms are 1, so cosine *is* the plain inner product.
- That is why "cosine" and "inner product" are usually the same menu option in a vector DB, and why the whole search collapses into one matrix multiply.`,
    },
    {
      type: 'math',
      intro: 'Cosine, and the identity that lets a database throw the division away.',
      latex: [
        '\\text{cos}(a, b) \\;=\\; \\frac{a \\cdot b}{\\lVert a \\rVert \\, \\lVert b \\rVert} \\;=\\; \\frac{\\sum_i a_i b_i}{\\sqrt{\\sum_i a_i^2}\\,\\sqrt{\\sum_i b_i^2}}',
        '\\hat{a} = \\frac{a}{\\lVert a \\rVert}, \\;\\; \\hat{b} = \\frac{b}{\\lVert b \\rVert} \\;\\;\\Longrightarrow\\;\\; \\text{cos}(a,b) = \\hat{a} \\cdot \\hat{b}',
        '\\lVert \\hat{a} - \\hat{b} \\rVert_2^2 = 2 - 2\\,\\hat{a}\\cdot\\hat{b} \\quad \\text{(on unit vectors, Euclidean rank} \\equiv \\text{cosine rank)}',
      ],
    },
    { type: 'visual', component: 'AttentionHeatmap', props: {} },
    {
      type: 'note',
      md: `Read this grid as a **retrieval** picture. Every cell is a dot product between two vectors — one number saying how aligned two pieces of meaning are. That is exactly the machinery you met inside self-attention, and it is exactly the machinery a vector database runs: attention scores one token's query against every token's key; semantic search scores one *question's* vector against every *passage's* vector. Take any row here, sort it, keep the largest few entries — you have just done top-k retrieval. The only differences are scale (a million rows instead of twelve) and what happens next: attention softmaxes the row and mixes values, retrieval just returns the top-k identifiers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Toy retrieval in NumPy — and the long-document bug, with real output',
      code: `import numpy as np

# Toy 4-d "embeddings". Axes: [refunds, payments, python, deployment]
DOCS = {
    'refund-policy':    np.array([0.90, 0.30, 0.02, 0.02]),
    'payments-api':     np.array([0.25, 0.92, 0.20, 0.10]),
    'deploy-runbook':   np.array([0.03, 0.08, 0.30, 0.95]),
    'company-handbook': np.array([2.60, 2.40, 2.30, 2.50]),  # long doc: everything, weakly
}
query = np.array([0.88, 0.35, 0.05, 0.05])       # "how do I get a refund?"

names = list(DOCS)
M = np.stack([DOCS[n] for n in names])           # (4 docs, 4 dims) — the entire "index"

def rank(scores, k=None):
    order = np.argsort(-scores)[:k]
    return [(names[i], round(float(scores[i]), 3)) for i in order]

print('norms:', [(n, round(float(np.linalg.norm(v)), 2)) for n, v in DOCS.items()])
print('\\nRAW DOT PRODUCT   ', rank(M @ query))

M_n = M / np.linalg.norm(M, axis=1, keepdims=True)   # normalize ONCE, at index time
q_n = query / np.linalg.norm(query)
cos = M_n @ q_n                                      # cosine IS the inner product now

print('COSINE (normalized)', rank(cos))
print('\\ntop-2 retrieved   ', rank(cos, 2))

# ------------------------- real output -------------------------
# norms: [('refund-policy', 0.95), ('payments-api', 0.98),
#         ('deploy-runbook', 1.0), ('company-handbook', 4.91)]
#
# RAW DOT PRODUCT    [('company-handbook', 3.368), ('refund-policy', 0.899),
#                     ('payments-api', 0.557), ('deploy-runbook', 0.117)]
# COSINE (normalized) [('refund-policy', 0.997), ('company-handbook', 0.723),
#                      ('payments-api', 0.599), ('deploy-runbook', 0.123)]
#
# top-2 retrieved    [('refund-policy', 0.997), ('company-handbook', 0.723)]`,
      annotations: {
        8: 'The villain: a long document that touches every topic weakly. Its norm is 4.91 — five times the others — purely because it is long.',
        13: 'One matrix of shape (n, d) IS the index. Everything a vector database adds is about not scanning all n rows.',
        16: 'argsort on the negated scores = descending order; slicing gives top-k. This is an exact scan — O(n·d) — the thing ANN indexes exist to avoid.',
        20: 'Raw dot product: the handbook wins at 3.368, almost 4x the actually-correct answer. It is not more relevant, it is just longer.',
        22: 'Normalize once when writing to the index, never again at query time. This single line is what every vector DB does under "metric: cosine".',
        24: 'After normalization the division is gone: cosine collapses to a bare inner product, one matmul for the whole corpus.',
        35: 'The fix in real numbers: refund-policy climbs to 1st at 0.997 and the handbook drops to 2nd. Same vectors, same query — only normalization changed.',
      },
    },
    {
      type: 'intuition',
      title: 'Chunking: the part everyone gets wrong',
      md: `You cannot embed a 200-page PDF into one vector — the average would mean nothing. So you split it. **How you split is the highest-variance decision in the whole pipeline**, and it gets less attention than the model choice.

- **Fixed-size with overlap.** Cut every N tokens, overlap by ~10–20% so a sentence cut in half survives in the neighbouring chunk. Trivial to implement, and it will happily slice a table down the middle.
- **Sentence / paragraph-aware.** Split on real boundaries, then pack sentences up to a size budget. Better chunks for one extra library call. This is the sane default.
- **Semantic chunking.** Embed sentence by sentence, start a new chunk where consecutive similarity drops — split where the topic actually shifts. Best boundaries, costs an embedding pass over the corpus, and the threshold is one more thing to tune.
- **Hierarchical / parent-document retrieval.** Embed *small* chunks so matching is precise, but return the *parent* section to the LLM so it has context. You get precision and context instead of choosing.
- The tension, stated plainly: **small chunks retrieve precisely but lose context; big chunks carry context but dilute the embedding.** A 2000-token chunk about five topics has a vector that is near none of them.`,
    },
    {
      type: 'note',
      md: `Starting numbers, not laws: **256–512 tokens per chunk with 10–20% overlap** is a reasonable first setting for prose, and short FAQ-style content wants smaller. Then the rule that matters more than any number: **chunk boundaries must respect document structure.** Never split inside a code block, a table, or a markdown heading's section — carry the heading path ("Billing > Refunds > EU customers") into the chunk text so an isolated fragment still says what it is about. Two failure modes to recognise: a chunk that is half of a table is retrieved and is unreadable; a chunk that ends mid-sentence gets an embedding for a fragment nobody would ever search for. Evaluate chunking the way you evaluate a model — build 30 real queries with known correct answers and measure recall@k across two or three chunking configs. It is a couple of hours and it usually moves the metric more than upgrading the embedding model.`,
    },
    {
      type: 'note',
      md: `**Store metadata beside every chunk, and filter on it.** Minimum: source document id, section/heading path, created or updated date, and — if your data is not public — the permissions or tenant id. Why it matters as much as similarity: (1) *correctness* — the 2019 policy and the 2024 policy are near-identical vectors, and only a date filter picks the right one; (2) *security* — similarity has no concept of "this user may not see that document", so filtering is your only access control, and it must run in the database, not after you get results back; (3) *citations* — you cannot show a source link you did not store. Note the engineering wrinkle interviewers probe: **filtered ANN search is harder than it looks.** Filter after the search and a restrictive filter can leave you zero results out of the top 100; filter before and you may be scanning outside the index. Good vector DBs implement filtered search inside the graph traversal — check that yours does before you rely on it.`,
    },
    {
      type: 'intuition',
      title: 'Scale: when the honest scan stops working',
      md: `The code above scored all four documents. Scoring all n documents is **exact k-NN**, and it is not stupid.

- Cost is **O(n·d)** per query: one dot product per document. On modern hardware a numpy or FAISS flat scan over ~100k vectors at d=768 is milliseconds.
- So the honest advice: up to roughly a hundred thousand vectors, brute force and stop optimizing. You get 100% recall, instant updates and deletes, and no index to rebuild.
- Past that, latency grows linearly with the corpus and you switch to **ANN — approximate nearest neighbour**.
- ANN gives up exactness. It might return the 1st, 2nd, 3rd and 5th best neighbours instead of the true top-4. In exchange, queries stop scanning the corpus.
- The trade in one sentence: **a few percent of recall for orders of magnitude of speed.** For search-and-summarise workloads, missing the 4th-best passage is usually invisible; a 3-second query is not.`,
    },
    {
      type: 'intuition',
      title: 'The three ANN ideas worth knowing',
      md: `Interviewers expect you to name these and say what each trades.

1. **HNSW** (Hierarchical Navigable Small World) — the default in most vector DBs. Build a multi-layer graph where each vector links to its neighbours; upper layers are sparse "highways", the bottom layer is dense. A query enters at the top, greedily walks toward the query vector, drops a layer, repeats. Roughly log-time hops instead of a full scan.
   - Two knobs: **M** (links per node — build-time, more links = better recall and a bigger index) and **ef** (how wide the search beam stays — query-time, higher = better recall, slower). \`ef_search\` is the dial you actually turn in production.
   - Cost: the whole graph lives in RAM, and it is memory-hungry — often more than the raw vectors.
2. **IVF** (Inverted File) — cluster all vectors with k-means into \`nlist\` buckets, keep each centroid. At query time compare against the centroids, then scan only the \`nprobe\` nearest buckets. Cheap to build, small memory footprint, and \`nprobe\` is a clean recall/speed dial. Weakness: a true neighbour sitting just across a cluster boundary gets missed.
3. **Product quantization (PQ)** — compression, not search. Split each vector into m sub-vectors, replace each with the id of its nearest centroid from a small learned codebook. A 1536-d float32 vector (6 KB) becomes ~96 bytes. Distances are then computed on the codes via lookup tables. Massive memory savings, some accuracy loss, and it composes with the others — \`IVF-PQ\` and \`HNSW-PQ\` are standard FAISS recipes.`,
    },
    {
      type: 'note',
      md: `**The number you tune is recall@k**, defined against the exact answer: run brute force on a sample of real queries to get the true top-k, then measure what fraction of it your ANN index returns. Targeting recall@10 of 0.95–0.99 is normal. Say this in an interview and you separate yourself instantly, because the alternative answer — "we set ef to 100 because the docs said so" — is what most candidates give. Three related facts worth carrying: recall is measured per index configuration and does not transfer between datasets; latency and recall trade smoothly, so plot the curve once and pick a point against your latency budget; and there is no point tuning ANN recall to 0.99 while your *chunking* is losing 30% of the answers — fix the pipeline in cost order.`,
    },
    {
      type: 'intuition',
      title: 'Hybrid search: the highest-value upgrade you can ship',
      md: `Dense embeddings have one systematic blind spot, and keyword search has the mirror-image one.

- Dense retrieval **misses exact tokens**: part numbers ("MX-7741-B"), person names, error codes, rare internal jargon, anything the embedding model never learned. It returns things that are *about the same topic* instead of the thing you literally named.
- **BM25** (the classic keyword ranking function — term frequency, damped, weighted by how rare the term is across the corpus) nails those exactly, and completely misses paraphrase: it cannot connect "money back" to "refund".
- The blind spots barely overlap. So run both and fuse the results. That is **hybrid search**.
- Fuse with **Reciprocal Rank Fusion (RRF)**: score each document by summing 1/(k + rank) over the two result lists, k ≈ 60. It uses only *ranks*, so you never have to make a BM25 score and a cosine score comparable — which is exactly the part that goes wrong when people try to blend raw scores.
- Practical framing for interviews: for most real corpora, adding BM25 + RRF to a working dense pipeline buys more than swapping in a bigger embedding model, and costs an afternoon.`,
    },
    {
      type: 'math',
      intro: 'RRF — the entire fusion algorithm. r(d) is the document\'s rank in one retriever\'s list; k damps how much the top spots dominate.',
      latex: [
        '\\text{RRF}(d) \\;=\\; \\sum_{r \\in R} \\frac{1}{k + \\text{rank}_r(d)}, \\qquad k \\approx 60',
        '\\text{rank } 1 \\to \\tfrac{1}{61} = 0.0164, \\quad \\text{rank } 2 \\to \\tfrac{1}{62} = 0.0161, \\quad \\text{rank } 50 \\to \\tfrac{1}{110} = 0.0091',
        '\\text{Ranks only} \\Rightarrow \\text{no calibration between a BM25 score and a cosine score.}',
        '\\text{A doc ranked well by } \\textbf{both} \\text{ retrievers beats a doc ranked 1st by only one.}',
      ],
    },
    {
      type: 'note',
      md: `**The vector-DB landscape, honestly.** \`pgvector\` is a Postgres extension — your vectors live in the same database as your rows, so joins, transactions, permissions and backups all just work; it does HNSW and IVFFlat and scales comfortably into the millions. **FAISS** is a Meta library, not a server: the fastest local index, no persistence or filtering story of its own, ideal when you own the process. **Qdrant**, **Weaviate** and **Milvus** are dedicated open-source vector databases with real filtering, hybrid search and horizontal scaling built in; **Pinecone** is the managed-service version of the same. The advice: **start with pgvector if you already run Postgres, or FAISS if you just need an in-process index** — and move to a dedicated vector DB when you can name the reason (tens of millions of vectors, complex metadata filtering at speed, or you need someone else to operate the sharding). "We chose Pinecone" as an opening move on a 50k-chunk corpus is the answer that gets follow-up questions you do not want.`,
    },
    {
      type: 'intuition',
      title: 'The operational realities nobody demos',
      md: `The demo is a weekend. Running it is the job.

- **Your index is model-specific.** Vectors from two different models — or two *versions* of one model — are not comparable at all. Change the embedding model and you must **re-embed the entire corpus**, which means budgeting a full re-index pass and running the old and new indexes side by side during the swap. Store the model name and version as metadata on every chunk, on day one.
- **Index build is not free.** HNSW construction is roughly O(n log n) with a large constant; millions of vectors take hours and a lot of RAM. Plan it as a batch job, not something that happens in a request.
- **Updates and deletes are awkward.** Graph indexes handle appends well and deletes badly — most implementations tombstone the entry and only truly remove it on a rebuild, so a heavily-churning corpus needs periodic re-indexing. If a document changes, re-chunk and re-embed the whole document, not one chunk, because the boundaries move.
- **Cost has three lines**, and people forget two: the one-off embedding pass over the corpus, the per-query embedding of the question (small but constant), and the standing RAM bill for the index (the big one — HNSW in memory often exceeds the vectors themselves).
- **Staleness is a correctness bug.** If your source of truth updates and the index does not, retrieval confidently returns last quarter's answer. Wire the index to the same pipeline that updates the documents.`,
    },
    {
      type: 'note',
      md: `Where this goes next: retrieval is the *input* to generation. The next module wires it end to end — load, chunk, embed, retrieve, **rerank** (a cross-encoder re-scores the top ~50 candidates by reading the query and passage together, far more accurately than any single-vector comparison can), then generate with citations. Keep the split clear in your head: the embedding index is a fast, approximate, high-recall filter over millions of chunks; the reranker is a slow, accurate ordering over the few dozen that survive. Building a two-stage retriever and being able to say why each stage exists is the difference between "I did the LangChain tutorial" and "I built this".`,
    },
  ],
  quiz: [
    {
      question: 'Why should you not just mean-pool a chat LLM\'s hidden states and use them as sentence embeddings?',
      options: [
        {
          text: 'The vectors would be too high-dimensional to store',
          explanation: 'Dimension is a cost issue, not a quality issue — and you could always project it down. This is not the reason.',
        },
        {
          text: 'A next-token objective optimizes states for predicting what follows, not for "are these two passages about the same thing" — embedding models are trained contrastively for exactly that',
          explanation: 'Correct. Same architecture, different training signal. Contrastive training pulls true query-passage pairs together and pushes random ones apart; that objective is what makes a vector retrievable.',
        },
        {
          text: 'LLM hidden states are not real-valued vectors',
          explanation: 'They are perfectly ordinary float vectors. You can pool them; they just retrieve poorly.',
        },
      ],
      correct: 1,
    },
    {
      question: 'A vector database advertises "cosine similarity" but internally computes a plain inner product. Is that a bug?',
      options: [
        {
          text: 'No — it normalizes vectors to unit length at index time, and on unit vectors cosine IS the inner product',
          explanation: 'Correct. cos(a,b) = â·b̂ once both norms are 1, so the division is done once at write time instead of on every comparison. This is why the two options are usually interchangeable in a vector DB.',
        },
        {
          text: 'Yes — inner product ranks long documents higher, so results will be wrong',
          explanation: 'That is exactly what happens on UN-normalized vectors (see the handbook at 3.368 in the code). Normalizing first removes it.',
        },
        {
          text: 'No — cosine and inner product always give the same ranking regardless of normalization',
          explanation: 'They do not. Without normalization, magnitude (i.e. document length) contributes to the score and can reorder results.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Your chunks are 2000 tokens each. Retrieval returns documents that are vaguely on-topic but rarely contain the specific answer. Most likely cause?',
      options: [
        {
          text: 'The embedding model is too small — upgrade to a 1536-d model',
          explanation: 'More dimensions will not un-blend a chunk that covers five topics. The averaging happened before the model ever mattered.',
        },
        {
          text: 'ANN recall is too low — raise ef_search',
          explanation: 'Worth checking, but ANN misses are near-neighbour errors. Consistently vague results point at what the vectors represent, not at whether the index found them.',
        },
        {
          text: 'Chunks that large cover several topics, so each vector is an average that sits near none of them — dilution',
          explanation: 'Correct. This is the core chunking tension: big chunks carry context but dilute the embedding. Smaller chunks, or hierarchical retrieval (embed small, return the parent), is the fix.',
        },
      ],
      correct: 2,
    },
    {
      question: 'You have 60,000 chunks and a 200ms latency budget. What index should you start with?',
      options: [
        {
          text: 'Exact brute-force scan — O(n·d) over 60k vectors is milliseconds, and you get 100% recall with instant updates',
          explanation: 'Correct. Below roughly 100k vectors, ANN buys you nothing but complexity, an index build step, and awkward deletes. Reach for ANN when latency actually grows into your budget.',
        },
        {
          text: 'HNSW with a large M, to be safe',
          explanation: 'You pay the RAM, the build time and the tombstoned-delete problem to solve a latency problem you do not have yet.',
        },
        {
          text: 'IVF-PQ, since compression is always worth it',
          explanation: 'PQ trades accuracy for memory. At 60k vectors memory is not the constraint, so you would be losing recall for free.',
        },
      ],
      correct: 0,
    },
    {
      question: 'Users search for the exact part number "MX-7741-B" and your dense-only search returns other, similar-sounding products. Best fix?',
      options: [
        {
          text: 'Increase the number of retrieved results k',
          explanation: 'If the embedding never encoded that exact token, the right document may not be in the top 100 either. More results dilute the context window without fixing the blind spot.',
        },
        {
          text: 'Add BM25 keyword retrieval alongside the dense search and fuse the two lists with reciprocal rank fusion',
          explanation: 'Correct. Exact rare tokens are dense retrieval\'s systematic blind spot and BM25\'s strength; the blind spots barely overlap. Hybrid + RRF is the standard, highest-value fix.',
        },
        {
          text: 'Fine-tune the embedding model on your catalogue',
          explanation: 'It helps somewhat and costs a great deal. It also cannot generalize to a part number added tomorrow — keyword matching can, for free.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Reciprocal Rank Fusion combines two retrievers using 1/(k + rank). Why ranks rather than the raw scores?',
      options: [
        {
          text: 'Ranks are cheaper to compute than scores',
          explanation: 'The scores already exist — producing the ranks requires sorting them. Cost is not the argument.',
        },
        {
          text: 'A BM25 score and a cosine score live on incomparable scales, so blending them directly requires calibration that ranks make unnecessary',
          explanation: 'Correct. BM25 is unbounded and corpus-dependent; cosine sits in roughly [0,1]. RRF sidesteps normalization entirely and rewards documents that both retrievers rank well.',
        },
        {
          text: 'Ranks preserve more information than scores',
          explanation: 'Backwards — ranks discard the magnitude of the gap between results. RRF accepts that loss deliberately in exchange for needing no calibration.',
        },
      ],
      correct: 1,
    },
    {
      question: 'You upgrade from a 768-d embedding model to a 1536-d one. What must happen to your existing index?',
      options: [
        {
          text: 'Nothing — you can pad the old vectors to the new dimension',
          explanation: 'Padding produces numbers, not meaning. The two models place concepts in entirely unrelated coordinate systems; the dimension mismatch is the least of it.',
        },
        {
          text: 'Only new documents need the new model; old ones can keep their vectors',
          explanation: 'This is the dangerous answer. Vectors from different models are not comparable at all, so a mixed index returns effectively random rankings across the two halves.',
        },
        {
          text: 'The entire corpus must be re-embedded and re-indexed — vectors are only comparable within one model version',
          explanation: 'Correct. Budget a full re-embedding pass, run old and new indexes side by side during the cutover, and store the model name and version as chunk metadata so you always know what an index contains.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why is metadata filtering in a vector database more than a convenience?',
      options: [
        {
          text: 'It is a correctness and security requirement — similarity cannot tell a 2019 policy from the 2024 one, and it has no concept of who is allowed to see a document',
          explanation: 'Correct. Near-duplicate versions have near-identical vectors, so only a date filter disambiguates them; and access control has to run inside the search, not as a post-filter, or a restrictive filter can empty your top-k.',
        },
        {
          text: 'It speeds up the ANN graph traversal',
          explanation: 'Usually the opposite — filtered ANN search is harder than unfiltered, and naive implementations degrade badly when the filter is restrictive.',
        },
        {
          text: 'It replaces the need for reranking',
          explanation: 'Different jobs. Filtering removes ineligible candidates; reranking reorders the eligible ones by relevance.',
        },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through how semantic search works, end to end, for a set of internal documents.',
      answer:
        'Offline: load the documents, split them into chunks that respect structure (headings, code blocks, tables intact), embed each chunk with a purpose-built encoder into a fixed-length vector, normalize to unit length, and write it to an index alongside metadata — source id, heading path, date, permissions. Online: embed the query with the same model and the same prefix convention, search the index for the nearest vectors by cosine (which on normalized vectors is a plain inner product), apply metadata filters inside the search, and return the top-k chunks with their sources. Then the two upgrades worth naming unprompted: run BM25 in parallel and fuse with RRF, because dense retrieval misses exact tokens; and rerank the top ~50 with a cross-encoder before handing anything to an LLM. Close on the honest bit: chunking and hybrid search move recall more than the embedding model choice does.',
      isCaseBased: false,
    },
    {
      question: 'Why do we normalize embedding vectors, and what specifically goes wrong if we do not?',
      answer:
        'Magnitude in a text embedding mostly tracks how long the passage is, not what it is about — so raw dot product gives long documents a systematic advantage independent of relevance. Concretely: a "company handbook" chunk that touches every topic weakly can have a norm five times a focused chunk\'s, and it will outrank the correct answer on raw inner product by a wide margin while sitting second on cosine. Cosine divides out both norms so only the angle counts. The engineering move is to normalize once at index time: after that both norms are 1, cosine equals the inner product, and the whole search is one matrix multiply with no per-query division — which is precisely why "cosine" and "inner product" are the same option in most vector databases. Bonus point: on unit vectors, Euclidean distance is a monotone function of cosine (‖â−b̂‖² = 2 − 2â·b̂), so the two metrics produce identical rankings there.',
      isCaseBased: false,
    },
    {
      question: 'Case: RAG over a 40,000-page technical manual. Retrieval returns plausible but useless passages. Design your chunking strategy and justify each decision.',
      answer:
        'Diagnose first — "plausible but useless" is the dilution signature: chunks too large, each vector averaging several topics. Design: (1) Parse structurally, not by character count — a technical manual has headings, procedures, tables and code blocks, and splitting inside any of them produces an unreadable chunk. (2) Chunk at section granularity, then split oversized sections at paragraph boundaries into 256–512 token pieces with ~15% overlap so a procedure spanning a boundary survives. (3) Prepend the heading path ("Chapter 7 > Hydraulics > Pressure test") to every chunk\'s text so an isolated fragment still declares its subject — this alone measurably improves retrieval. (4) Use parent-document retrieval: embed the small chunks for precise matching but return the enclosing section to the LLM, which resolves the precision-versus-context tension instead of picking a side. (5) Keep tables and code blocks whole even if oversized, and consider a short LLM-written summary as the embedded text for a table whose raw form embeds poorly. (6) Store metadata: manual version, chapter, page, revision date — version filtering is essential when three editions of the same manual are indexed. Then validate: 30 real questions with known answers, measure recall@10 across two or three configurations, pick by number. Say explicitly that you would test before shipping — that is what separates this answer from a list of tactics.',
      isCaseBased: true,
    },
    {
      question: 'Explain HNSW to someone who knows what a graph is. Then tell me what the knobs do.',
      answer:
        'Build a graph over the vectors where each node links to its approximate nearest neighbours, arranged in layers: the top layer is sparse and spans long distances, each layer down is denser, and the bottom layer contains everything. A query enters at the top and greedily moves to whichever neighbour is closer to the query vector; when it cannot improve, it drops a layer and repeats with finer links. Long hops first, short hops last — like taking the motorway before the side streets — so you touch a logarithmic-ish number of nodes instead of scanning n. Knobs: M is the number of links per node, set at build time; higher M means better recall and a larger, slower-to-build index. ef_construction controls how hard the builder searches for good neighbours — build-time quality. ef_search is the query-time beam width: how many candidates stay in play during descent; raise it for recall, lower it for latency, and this is the one you actually tune in production. The cost to name honestly: the graph is RAM-resident and often larger than the raw vectors, and deletions are typically tombstones that only clear on a rebuild.',
      isCaseBased: false,
    },
    {
      question: 'When is approximate nearest neighbour search NOT worth it?',
      answer:
        'Below roughly 100k vectors, an exact flat scan is O(n·d) and lands in single-digit or low-double-digit milliseconds — FAISS IndexFlat or even numpy. You get 100% recall, instant inserts and deletes with no rebuild, no index to tune, and no tombstone garbage. ANN would buy latency you were not spending and cost you a build pipeline, a RAM bill, a recall metric to monitor and awkward deletes. Also skip ANN when correctness is contractual — legal or compliance retrieval where a missed document is a real problem — or when your query volume is low enough that per-query cost simply does not matter. The threshold moves with d and your latency budget, so the right framing is: measure the flat scan on your actual data first, and adopt ANN when the measurement says you need it. Volunteering "we started with brute force" is a strong signal in an interview; most candidates jump straight to a vector DB.',
      isCaseBased: false,
    },
    {
      question: 'What is hybrid search, why does it work, and how do you combine the two result lists?',
      answer:
        'Hybrid search runs dense (embedding) retrieval and sparse (BM25/keyword) retrieval in parallel and merges the results. It works because their failure modes are almost disjoint: dense retrieval understands paraphrase — "money back" finds "refund" — but systematically misses exact rare tokens like part numbers, error codes, person names and internal jargon that the encoder never learned; BM25 nails those exactly and cannot bridge a paraphrase at all. Combine with Reciprocal Rank Fusion: score each document as the sum over retrievers of 1/(k + rank), with k around 60, then sort. Using ranks rather than scores is the point — a BM25 score is unbounded and corpus-dependent while cosine sits near [0,1], so blending raw scores needs calibration that RRF makes unnecessary; a document ranked decently by both beats one ranked first by only one. Alternatives exist (learned weighted fusion, or a cross-encoder reranker over the union) but RRF is the default because it has essentially one hyperparameter and no training. Worth stating outright: on most real corpora this is a bigger win than upgrading the embedding model, and it takes an afternoon.',
      isCaseBased: false,
    },
    {
      question: 'Case: your team wants to switch embedding models to improve quality. You have 8 million indexed chunks in production. Plan the migration.',
      answer:
        'Start by naming the constraint: vectors from two models are not comparable, so this is a full re-embedding of all 8M chunks, not an incremental change — and if the dimension changes, a new index schema too. Plan: (1) Justify it first — evaluate the candidate model offline on a held-out query set with recall@k and end-to-end answer quality, because a full re-index is expensive and the win is often smaller than a chunking fix. (2) Estimate cost and time: 8M chunks through a hosted API is a real invoice and hours-to-days of throughput; a self-hosted model on GPUs may be cheaper at this volume. Include the index build itself — HNSW over 8M vectors is hours and a large RAM peak. (3) Build the new index alongside the old one; never mutate in place. Batch, checkpoint, and make the job resumable — it will fail partway. (4) Cut over behind a flag with shadow traffic first: send real queries to both, compare top-k overlap and rerank scores, and watch for regressions on query classes the old index handled well. (5) Roll out gradually, keep the old index warm for a fast rollback, and only then decommission. (6) Fix the root cause going forward: store the model name and version as metadata on every chunk, and version the index name itself, so "which model is this index?" is never a guess. The tradeoff to state: you are paying double storage and double embedding cost during the transition, and that redundancy is what buys you a safe rollback.',
      isCaseBased: true,
    },
    {
      question: 'How do you pick an embedding dimension, and what does the choice actually cost?',
      answer:
        'By measuring recall@k on your own queries, not by picking the biggest number available. The realistic ladder is 384 (MiniLM-class, CPU-friendly, small index), 768 (base encoders, the sensible middle), and 1536–3072 (large hosted models, best generic quality). Cost is linear in d and you pay it three times: disk, RAM for the index, and every distance computation at query time — 1M vectors at d=1536 in float32 is about 6 GB before HNSW overhead, versus about 1.5 GB at 384. The non-obvious point: a smaller model fine-tuned on your domain often beats a larger generic one, so the dimension question and the model-quality question are not the same question. Two more levers worth naming: Matryoshka-trained embeddings let you truncate to the first 256 or 512 dimensions and trade a little quality for a much smaller index, and product quantization compresses in a different direction (1536-d float32 down to roughly 96 bytes) if memory rather than quality is your binding constraint.',
      isCaseBased: false,
    },
    {
      question: 'What is asymmetric search, and what breaks when you get it wrong?',
      answer:
        'A query and a passage are different kinds of text — one short and interrogative, the other long and declarative — so many retrieval models encode them differently. That ranges from required literal prefixes (E5 and BGE want "query: " and "passage: "), through instruction prefixes applied only to the query, all the way to two entirely separate encoders trained jointly, as in DPR. What breaks: if you embed documents with the passage convention and queries with the passage convention too — or drop the prefixes entirely — recall degrades quietly. Nothing errors, results are merely worse, and you will blame the chunking. It is one of the most common causes of "my semantic search returns garbage". Two operational rules: read the model card and apply its exact convention on both sides, and sanity-check by embedding an identical string through both code paths and confirming cosine is essentially 1.0. Also note the contrast — symmetric tasks like duplicate-ticket detection or sentence clustering compare like with like, and that is a different model choice, not the same model used loosely.',
      isCaseBased: false,
    },
    {
      question: 'Which vector database would you choose, and what would make you change your mind?',
      answer:
        'Default: pgvector if the team already runs Postgres, because the vectors live beside the relational data — joins, transactions, existing permissions, existing backups, one system to operate — and it supports HNSW and IVFFlat comfortably into the millions of rows. If I need an in-process index with no server, FAISS: fastest local search, but it is a library, so persistence, filtering and distribution are my problem. What would change my mind, in order: tens of millions of vectors or more; heavy metadata filtering where I need filtering fused into the graph traversal rather than applied after; built-in hybrid search and reranking I would otherwise write myself; or an operations constraint where I want sharding and replication handled for me — that is when Qdrant, Weaviate or Milvus earn their keep, and Pinecone if I would rather buy the operations than run them. The framing that matters: name the trigger, do not name the brand. "We picked Pinecone" for a 50k-chunk corpus invites the follow-up question you cannot answer.',
      isCaseBased: false,
    },
    {
      question: 'Case: an internal RAG search over company documents. Users report it sometimes surfaces documents they should not be able to see, and answers occasionally cite superseded policies. Diagnose and fix.',
      answer:
        'Two distinct bugs; separate them, because one is a security incident and the other is a freshness bug. Permissions: similarity has no notion of authorization, so the only defence is metadata filtering — and if it is applied as a post-filter after retrieval, results the user may not see were already read from the index, and a restrictive filter can also empty the top-k. Fix: store tenant/ACL identifiers on every chunk at ingestion, push the filter into the vector search itself (pre-filtered or filtered-traversal ANN), and verify that the ACL is re-checked at read time rather than baked in at index time — permissions change after indexing. Treat any leak as an incident: audit which queries returned which documents. Superseded policies: near-identical versions of a document produce near-identical vectors, so similarity alone cannot pick the current one. Fix: store effective and expiry dates plus a version field, filter to the current version by default, and if history is needed, make it an explicit query mode. Then look upstream at whether the index is stale at all — if the pipeline updating documents does not also update the index, retrieval returns last quarter\'s answer with full confidence. Finally, hardening for both: show source and date on every citation so users can see what was used, and add a small regression suite of queries with known-correct documents that runs on every re-index.',
      isCaseBased: true,
    },
  ],
  flashcards: [
    { front: 'How do you get ONE vector for a whole passage?', back: 'Run a transformer encoder, then mean-pool the token vectors or take the CLS token. Critically, the model must be TRAINED for this (contrastively) — a raw LLM\'s hidden states are not good sentence embeddings.' },
    { front: 'Typical embedding dimensions and what d costs', back: '384 (MiniLM class), 768 (base), 1536/3072 (large hosted). Cost is linear in d and paid three times: storage, index RAM, and every distance computation.' },
    { front: 'Why normalize embeddings?', back: 'Magnitude tracks passage length, not topic — long documents win on raw dot product. Normalize once at index time; then cosine IS the plain inner product.' },
    { front: 'Asymmetric search', back: 'Queries and documents are different kinds of text: many models need different prefixes ("query: " / "passage: ") or even separate encoders (DPR). Mixing conventions silently destroys recall.' },
    { front: 'The chunking tension in one line', back: 'Small chunks retrieve precisely but lose context; big chunks carry context but dilute the embedding. Start at 256–512 tokens with 10–20% overlap and respect document structure.' },
    { front: 'Parent-document (hierarchical) retrieval', back: 'Embed SMALL chunks so matching is precise, but return the larger parent section to the LLM for context. Gets both instead of choosing.' },
    { front: 'When does exact k-NN stop working?', back: 'Exact scan is O(n·d) per query and is fine to roughly 100k vectors. Past that, use ANN — trading a few percent of recall for orders of magnitude of speed.' },
    { front: 'HNSW, IVF, PQ in one line each', back: 'HNSW: layered neighbour graph, greedy descent; knobs M and ef_search. IVF: k-means buckets, scan the nprobe nearest. PQ: compress vectors into codebook ids (~6 KB → ~96 bytes); composes with the other two.' },
    { front: 'Hybrid search + RRF', back: 'Dense misses exact tokens (part numbers, names); BM25 misses paraphrase. Run both, fuse with RRF: score = Σ 1/(k + rank), k≈60. Ranks only, so no score calibration needed. Highest-value retrieval upgrade there is.' },
    { front: 'Why is your index model-specific?', back: 'Vectors from different models (or versions) are not comparable. Changing the embedding model means re-embedding the ENTIRE corpus — store model name + version as chunk metadata.' },
  ],
  mindmapMarkdown: `- Embeddings, Vector DBs & Semantic Search
  - Modern text embeddings
    - encoder + mean pooling or CLS token
    - must be TRAINED for it (contrastive) — raw LLM states are not enough
    - d = 384 / 768 / 1536: quality vs storage, RAM, query cost (Matryoshka truncates)
    - asymmetric: query vs passage prefixes, or two encoders (DPR)
  - Cosine similarity
    - angle only — magnitude tracks length, so long docs win on raw dot product
    - normalize once at index time -> cosine IS the inner product (math: dot product module)
  - Chunking (the high-variance decision)
    - fixed-size + 10-20% overlap; sentence/paragraph-aware is the sane default
    - semantic: split where the topic shifts
    - hierarchical/parent-doc: embed small, return the parent
    - tension: small = precise, no context; big = context, diluted
    - respect structure (headings, code, tables); carry the heading path
    - metadata: source, section, date, permissions -> filtering = correctness + security
  - Vector search at scale
    - exact k-NN: O(n·d), fine to ~100k vectors
    - ANN: a few % recall for orders of magnitude of speed
    - HNSW: layered small-world graph, greedy descent, knobs M / ef
    - IVF: cluster, probe the nprobe nearest buckets
    - PQ: codebook compression, composes with IVF/HNSW
    - tune recall@k against a brute-force ground truth
  - Hybrid search
    - dense misses exact terms; BM25 misses paraphrase
    - fuse with RRF: 1/(k+rank), k≈60 — ranks need no calibration
    - biggest retrieval win per hour of work
  - The landscape
    - start with pgvector (in your Postgres) or FAISS (in-process)
    - scale out: Qdrant / Weaviate / Milvus / Pinecone
  - Operations
    - index is model-specific -> model change = full re-embed
    - build time and RAM: HNSW often exceeds the raw vectors
    - deletes are tombstones until rebuild; staleness is a correctness bug
  - Next: RAG — retrieve -> rerank (cross-encoder) -> generate with citations`,
}

export default m
