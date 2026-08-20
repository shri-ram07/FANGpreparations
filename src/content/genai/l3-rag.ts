import type { Module } from '../types'

const m: Module = {
  id: 'genai-l3-rag',
  subjectId: 'genai',
  level: 3,
  title: 'RAG End to End: Retrieve, Rerank, Generate',
  whyItMatters:
    'RAG is the single most common thing GenAI engineers are actually paid to build, and "RAG vs finetuning" plus "how would you stop it hallucinating" are two questions you will be asked in almost every applied-LLM interview. Anyone can wire LangChain in an afternoon; what separates a hire is knowing where the pipeline breaks — retrieval misses, chunk boundaries, lost-in-the-middle, permission leakage — and how to measure retrieval and generation separately. This module builds the pipeline, then attacks it.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Four things a model cannot do — and one fix for all four',
      md: `A pretrained LLM is a very well-read person who has been locked in a room since their training cutoff, with no notes and no library card.

- **Cutoff.** It knows nothing after its training data ended. Ask about last quarter's incident and it guesses.
- **No private data.** Your wiki, your tickets, your PDFs were never in the training set and never will be.
- **Confident hallucination.** It has no "I looked it up" signal, so a fabricated answer feels identical to a correct one — to the model *and* to the user.
- **No citations.** Knowledge is smeared across billions of weights. There is no page to point at.

RAG — **R**etrieval-**A**ugmented **G**eneration — fixes all four with one move: **find the right passages at query time and put them INTO the prompt**. The model stops recalling and starts reading. Fresh data, private data, grounded answers, and a source link, because you know exactly which passages you inserted.`,
    },
    {
      type: 'intuition',
      title: 'RAG vs finetuning: behaviour vs knowledge',
      md: `The line that ends the argument in an interview: **finetuning teaches behaviour, RAG supplies knowledge.**

- Finetuning (see the LoRA/finetuning module) changes weights. Use it to change *how* the model responds: tone, output format, domain jargon, a task it keeps getting structurally wrong.
- RAG changes the prompt. Use it to change *what* the model knows: facts that are private, that change weekly, or that must be cited.
- Facts baked into weights cannot be updated without retraining, cannot be cited, and cannot be permission-scoped per user. Three fatal properties for a knowledge system.
- They compose, and in production they usually do: finetune a small model to answer tersely in your format, then feed it retrieved passages.
- Cheap heuristic: *if the correct answer changes when a document changes, it is RAG. If the correct answer changes when your style guide changes, it is finetuning.*`,
    },
    {
      type: 'intuition',
      title: 'The ingestion side: load, chunk, embed, index',
      md: `Half the pipeline runs offline, before any user asks anything. It is a batch job, not a request handler.

1. **Load and parse.** PDFs, HTML, Confluence, Slack, code. Extract text plus metadata: source URI, title, date, author, and the access-control tag.
2. **Chunk.** Split into retrievable units, typically 200–500 tokens with some overlap, split on structure (headings, paragraphs) rather than blind character counts. The embeddings module covers strategies; the RAG-level point is that a chunk is your *unit of truth* — retrieval can never return anything smaller.
3. **Embed.** Run every chunk through an embedding model. One vector per chunk, computed once.
4. **Index.** Store vectors in a vector DB alongside the raw text and every metadata field you will ever want to filter on. Also build a keyword index (BM25) — you will need it.

Honest warning, because this is where real projects bleed time: **parsing is the hard part, not the AI part.** Multi-column PDFs interleave text. Tables become word soup. Scans need OCR. Headers repeat on every page and pollute every chunk. Budget more time for the parser than for everything downstream combined, and look at your chunks with your own eyes before you trust any of it.`,
    },
    {
      type: 'intuition',
      title: 'The query path: retrieve, rerank, assemble, generate',
      md: `Now a question arrives. Five steps, and a latency budget ticking.

1. **Embed the query** with the *same* model used at ingestion. Different model, different vector space, garbage results.
2. **Retrieve top-k, hybrid.** Dense vector search catches paraphrase ("how much VRAM" finds "GPU memory"); keyword/BM25 catches exact tokens dense search fumbles — error codes, product names, \`NullPointerException\`. Fuse the two ranked lists (reciprocal rank fusion is the boring default that works). Filter by metadata **in the query**, never after.
3. **Rerank** the ~50 candidates down to ~5 with a cross-encoder.
4. **Assemble the prompt.** Passages with their source labels, the question, and an instruction: *answer ONLY from the context; if the context does not contain the answer, say "I don't know".* Order matters — see the failure modes.
5. **Generate and cite.** Stream the answer, and return the source of every passage you inserted so the user can check you.`,
    },
    {
      type: 'note',
      md: 'Why a cross-encoder reranker beats the retriever it is reranking: the retriever is a **bi-encoder** — it embedded the query and the chunk *separately*, then compared two independent vectors. All the chunk\'s nuance was squeezed into one vector before it ever heard the question. A **cross-encoder** feeds query and chunk into one transformer *together*, so every query token can attend to every chunk token. Far more accurate, and far slower: it cannot precompute anything, so cost is one full forward pass per (query, chunk) pair. That is exactly why the two are stacked — retrieve 50 cheaply with the bi-encoder (one dot product each, over millions of chunks), then rerank those 50 accurately with the cross-encoder. Cheap-and-wide, then expensive-and-narrow.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One question through the whole RAG pipeline — then two ways it breaks',
        notice: 'Step through it. Watch the candidate list get cut from 5 to 3 and REORDER at the rerank step — then watch the last two frames, where the pipeline runs perfectly and still gives a wrong or illegal answer.',
        leftLabel: 'query path',
        rightLabel: 'index / candidates',
        frames: [
          {
            note: '1. A question arrives. Nothing is retrieved yet — the index was already built offline by the ingestion job.',
            stack: [{ name: 'question', value: '"how big is the KV cache?"' }],
            heap: [{ id: 'idx', value: '12,400 chunk vectors', label: 'vector index' }],
          },
          {
            note: '2. Embed the question with the SAME model used at ingestion. One 768-dim vector. ~20 ms.',
            stack: [
              { name: 'question', value: '"how big is the KV cache?"' },
              { name: 'q_vec', value: '[0.02, -0.11, ...]', to: 'idx' },
            ],
            heap: [{ id: 'idx', value: '12,400 chunk vectors', label: 'vector index' }],
          },
          {
            note: '3. Hybrid search returns 5 candidates (real systems: 50). The ACL filter is applied INSIDE the query, so forbidden chunks are never even scored.',
            stack: [
              { name: 'q_vec', value: '[0.02, -0.11, ...]', to: 'c3' },
              { name: 'filter', value: 'acl IN user.groups' },
            ],
            heap: [
              { id: 'c3', value: 'int8 quantization...', label: '0.868' },
              { id: 'c1', value: 'kv cache memory/token', label: '0.863' },
              { id: 'c8', value: 'gpu memory limits', label: '0.514' },
              { id: 'c5', value: 'serving glossary', label: '0.407' },
              { id: 'c6', value: 'kv cache eviction', label: '0.206' },
            ],
          },
          {
            note: '4. Cross-encoder reranks: it reads the question TOGETHER with each chunk. c1 jumps to the top, c3 (topically close, actually about quantization) is dropped, c8 is dropped. 5 -> 3.',
            stack: [{ name: 'context', value: 'top 3 passages', to: 'c1' }],
            heap: [
              { id: 'c1', value: 'kv cache memory/token', label: 'rerank 1.327' },
              { id: 'c6', value: 'kv cache eviction', label: 'rerank 1.133' },
              { id: 'c5', value: 'serving glossary', label: 'rerank 0.840' },
            ],
          },
          {
            note: '5. Prompt assembly. Best passage FIRST and last, weakest in the middle — models attend least to the middle of a long context. Each passage carries its source label.',
            stack: [
              { name: 'prompt[0]', value: 'system: answer only from context' },
              { name: 'prompt[1]', value: '[S1] ...', to: 'c1' },
              { name: 'prompt[2]', value: '[S2] ...', to: 'c5' },
              { name: 'prompt[3]', value: '[S3] ...', to: 'c6' },
              { name: 'prompt[4]', value: 'user: how big is the KV cache?' },
            ],
            heap: [
              { id: 'c1', value: 'kv cache memory/token', label: 'S1 serving.md#kv' },
              { id: 'c5', value: 'serving glossary', label: 'S2 glossary.md' },
              { id: 'c6', value: 'kv cache eviction', label: 'S3 chat-limits.md' },
            ],
          },
          {
            note: '6. Generate. The answer streams token by token; citations [S1][S3] resolve to real URLs because we know exactly which passages we inserted.',
            stack: [
              { name: 'answer', value: '"2 * n_layers * ... [S1]"', to: 'c1' },
              { name: 'citations', value: '[S1, S3]', to: 'c6' },
            ],
            heap: [
              { id: 'c1', value: 'kv cache memory/token', label: 'S1 serving.md#kv' },
              { id: 'c6', value: 'kv cache eviction', label: 'S3 chat-limits.md' },
            ],
          },
          {
            note: 'FAILURE 1 - retrieval miss. The real answer lives in c47, which never entered the top-k. The generator cannot save you: it answers confidently from three near-misses, or says "I do not know" on a question your corpus can answer.',
            stack: [
              { name: 'context', value: 'top 3 passages', to: 'c5', danger: true },
              { name: 'answer', value: 'confident + wrong', danger: true },
            ],
            heap: [
              { id: 'c5', value: 'serving glossary', label: 'retrieved', danger: true },
              { id: 'c8', value: 'gpu memory limits', label: 'retrieved', danger: true },
              { id: 'c3', value: 'int8 quantization', label: 'retrieved', danger: true },
              { id: 'c47', value: 'THE ACTUAL ANSWER', label: 'never retrieved', danger: true },
            ],
          },
          {
            note: 'FAILURE 2 - permission leak. No ACL filter on the query, so a salary document scored well and got pasted into the prompt. The model quotes it back to a user who may not read it. Fix: filter at query time, never post-hoc.',
            stack: [
              { name: 'filter', value: 'NONE', danger: true },
              { name: 'prompt[2]', value: '[S2] ...', to: 'cx', danger: true },
              { name: 'answer', value: 'leaks salary band', danger: true },
            ],
            heap: [
              { id: 'c1', value: 'kv cache memory/token', label: 'S1 public' },
              { id: 'cx', value: 'comp-bands-2026.pdf', label: 'acl: hr-only', danger: true },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Retrieve cheap, rerank accurate — 50 lines of NumPy, real output pasted',
      code: `import numpy as np

rng = np.random.default_rng(5)

VOCAB = ['kv', 'cache', 'memory', 'attention', 'gpu', 'batch', 'quantize', 'latency', 'token', 'cost']
IDX = {w: i for i, w in enumerate(VOCAB)}
E = rng.normal(size=(len(VOCAB), 16))           # one learned vector per content word
E /= np.linalg.norm(E, axis=1, keepdims=True)

# (chunk label, the content words left after stopword removal)
DOCS = [
    ('c1  kv cache memory per token',        'kv cache memory token'),
    ('c2  attention cost is quadratic',      'attention cost token'),
    ('c3  int8 quantization cuts memory',    'quantize memory gpu'),
    ('c4  batch size vs latency',            'batch latency gpu'),
    ('c5  serving-glossary grab-bag',        'memory gpu batch cost token latency attention quantize kv cache'),
    ('c6  kv cache eviction for long chats', 'kv cache token'),
    ('c7  latency budget per request',       'latency token cost'),
    ('c8  gpu memory is the constraint',     'gpu memory cost'),
]
QUERY = 'kv cache memory'

P = rng.normal(size=(16, 4))                    # the lossy squeeze every bi-encoder makes

def embed(text):                                # bi-encoder: mean-pool, compress, L2-normalise
    v = E[[IDX[w] for w in text.split()]].mean(axis=0) @ P
    return v / np.linalg.norm(v)

D = np.stack([embed(d) for _, d in DOCS])       # built ONCE, offline, by the ingestion job
q = embed(QUERY)                                # built per request, at query time

cheap = D @ q                                   # one dot product per chunk - the cheap stage
cand = np.argsort(-cheap)[:5]                   # retrieve 5 (real systems: 50)
print('stage 1 - bi-encoder cosine, top 5:')
for r in cand:
    print(f'  {cheap[r]: .3f}  {DOCS[r][0]}')

df = np.array([sum(w in d.split() for _, d in DOCS) for w in VOCAB])
idf = np.log(len(DOCS) / df)

def cross(query, doc):                          # cross-encoder: reads query AND doc together
    dt = doc.split()
    return sum(idf[IDX[w]] * (w in dt) for w in query.split()) / np.sqrt(len(dt))

ce = np.array([cross(QUERY, DOCS[r][1]) for r in cand])
top = cand[np.argsort(-ce)][:3]                 # rerank to 3 (real systems: 5)
print('\\nstage 2 - cross-encoder rerank, top 3:')
for r in top:
    print(f'  {cross(QUERY, DOCS[r][1]): .3f}  {DOCS[r][0]}')

print('\\nbest before rerank:', DOCS[cand[0]][0])
print('best after  rerank:', DOCS[top[0]][0])

# ---------------- actual output ----------------
# stage 1 - bi-encoder cosine, top 5:
#    0.868  c3  int8 quantization cuts memory
#    0.863  c1  kv cache memory per token
#    0.514  c8  gpu memory is the constraint
#    0.407  c5  serving-glossary grab-bag
#    0.206  c6  kv cache eviction for long chats
#
# stage 2 - cross-encoder rerank, top 3:
#    1.327  c1  kv cache memory per token
#    1.133  c6  kv cache eviction for long chats
#    0.840  c5  serving-glossary grab-bag
#
# best before rerank: c3  int8 quantization cuts memory
# best after  rerank: c1  kv cache memory per token`,
      annotations: {
        16: 'The distractor: a chunk stuffed with every keyword. Mean-pooling makes it look vaguely relevant to everything, and length normalisation in the reranker is what puts it back in its place.',
        23: 'The honest core of the analogy. A real bi-encoder squeezes a whole chunk into one fixed vector BEFORE it has seen the query — detail is lost. This projection is that loss, made visible.',
        29: 'Offline. Millions of chunk vectors, computed once by the ingestion job. This is why dense retrieval is cheap at query time.',
        32: 'The entire cheap stage: one dot product per chunk. A real vector DB does this approximately (HNSW/IVF) so it is sublinear, not linear.',
        41: 'The cross-encoder. Note it takes BOTH arguments and looks at them together — it cannot be precomputed, which is exactly why you only run it on 50 candidates, not 12,400.',
        43: 'Dividing by sqrt(len) is the length penalty: a long grab-bag chunk that happens to contain your words is not the same as a short chunk about them.',
        56: 'Look at the flip. Cheap retrieval ranked c3 (quantization) FIRST — topically adjacent, wrong answer. The reranker demoted it out of the top 3 entirely and promoted c1. This one reorder is the whole reason reranking exists.',
      },
    },
    {
      type: 'intuition',
      title: 'Failure modes, part 1: retrieval broke',
      md: `Every RAG demo works. Every RAG product fails here first. Learn these by name — interviewers grade on whether you can name them.

- **Retrieval miss.** The answer was never in the top-k. Nothing downstream can fix this: the generator cannot cite what it never received. This is the #1 cause of bad RAG answers, and the reason you measure retrieval separately.
- **Chunk boundary split.** The question is "what is the refund window?" and the chunker cut between "customers may request a refund within" and "30 days". Both chunks retrieve; neither answers. Fix: overlap, structure-aware splitting, or parent-document retrieval.
- **Conflicting or stale documents.** The 2023 policy and the 2026 policy both retrieve. The model averages them or picks one at random. Fix: date metadata, recency boosting, and deleting old versions from the index instead of hoping.
- **Over-retrieval.** "Context is cheap now, send 50 chunks." Signal-to-noise drops, cost per query rises, and accuracy usually *falls*. More context is not more knowledge.
- **Lost in the middle.** Models attend most to the start and end of a long context and least to the middle. A correct passage buried at position 12 of 20 can be functionally invisible. Fix: send fewer, better passages, and **order them** — strongest first, second-strongest last.`,
    },
    {
      type: 'intuition',
      title: 'Failure modes, part 2: generation and security',
      md: `- **The model ignores your context.** You retrieved the right passage; it answered from its parametric memory anyway — usually when the retrieved text contradicts something it "knows", or when your instruction is weak. Fix: an explicit instruction to use only the context, passages clearly delimited and labelled, and a faithfulness check that flags unsupported claims.
- **Refusal when it should answer**, the mirror image: an over-strict "only from context" prompt makes the model say "I don't know" even when the passage does support the answer. Both directions must be measured; tuning one breaks the other.
- **Permission leakage.** The retriever fetched a document this user is not allowed to read, and the model helpfully quoted it. This is the failure that ends careers, because it is a data breach with a chat log as evidence.
- The fix for leakage is one sentence: **filter at the query, never post-hoc.** The ACL predicate goes into the vector search itself, so a forbidden chunk is never scored, never ranked, never in a prompt, never in a cache, never in a log. Retrieving then dropping is not a fix — the document was already loaded, and one bug or one prompt-injection away from the user.
- Practical consequence: every chunk carries its ACL tag as indexed metadata from ingestion day one. Retrofitting permissions onto an existing index is a rewrite.`,
    },
    {
      type: 'note',
      md: 'One more, worth its own line because it is easy to miss: **a shared cache is an ACL bypass.** If you cache answers by question text and user A asked something that retrieved their private document, user B asking the same question gets A\'s answer straight from the cache — with every filter perfectly configured. Cache keys must include the permission scope.',
    },
    {
      type: 'intuition',
      title: 'Evaluation: measure the two halves separately',
      md: `"Our RAG is 72% accurate" is a useless sentence. Accurate at what — finding, or writing? Split it, always.

- **Retrieval metrics.** *recall@k*: was a gold passage in the top-k? *MRR*: how high did the first correct passage rank? Retrieval recall is a hard ceiling — if recall@5 is 0.7, no generator alive gets you past 70%.
- **Generation metrics.** *Faithfulness / groundedness*: is every claim in the answer supported by the retrieved text? *Answer relevance*: does it actually address the question? *Context precision*: how much of what you sent was useful?
- The RAGAS-style family is exactly this set — faithfulness, answer relevance, context precision, context recall — scored with an LLM-as-judge, cheap enough to run per commit.
- Why the split is non-negotiable: retrieval@5 = 0.95 with faithfulness = 0.60 means fix the prompt. Retrieval@5 = 0.55 with faithfulness = 0.95 means fix the chunker and the retriever. Same end-to-end score, opposite fixes.
- **Build a golden set.** 50–100 real questions, each with the source passage that answers it, written by someone who knows the domain. It takes an afternoon, it is the highest-leverage afternoon in the project, and without it you are tuning by vibes.`,
    },
    {
      type: 'math',
      intro: 'The three numbers to quote in an interview, and the inequality that makes the split matter.',
      latex: [
        '\\text{recall@}k = \\frac{\\left| \\{\\text{gold passages}\\} \\cap \\{\\text{top-}k \\text{ retrieved}\\} \\right|}{\\left| \\{\\text{gold passages}\\} \\right|}',
        '\\text{MRR} = \\frac{1}{|Q|}\\sum_{i=1}^{|Q|} \\frac{1}{\\text{rank}_i}, \\quad \\text{rank}_i = \\text{position of the first correct passage } (\\tfrac{1}{\\text{rank}} = 0 \\text{ if absent})',
        '\\text{faithfulness} = \\frac{\\#\\{\\text{claims in the answer supported by the retrieved context}\\}}{\\#\\{\\text{claims in the answer}\\}}',
        '\\text{end-to-end accuracy} \\;\\le\\; \\text{recall@}k \\;\\;\\Rightarrow\\;\\; \\text{recall@}5 = 0.70 \\text{ caps you at } 70\\% \\text{, whatever the model}',
      ],
    },
    {
      type: 'intuition',
      title: 'Advanced patterns, one line each',
      md: `Reach for these when the golden set says a specific stage is failing — not before.

- **Query rewriting / expansion.** Turn "and what about the second one?" into a standalone query using chat history. Not optional: in any multi-turn chatbot, follow-ups embed to nonsense without it. This is the highest-value item on the list.
- **HyDE** (Hypothetical Document Embeddings). Have the LLM *write a fake answer*, embed that, and search with it — a hypothetical answer looks more like the target passage than the question does.
- **Multi-query fusion.** Generate 3–5 paraphrases of the query, retrieve for each, fuse the ranked lists. Buys recall for extra latency and cost.
- **Parent-document retrieval.** Index small precise chunks, but return the larger parent section they came from. Precision when searching, context when reading — the standard cure for chunk-boundary splits.
- **Self-querying.** Let the LLM extract metadata filters from the question: "Q3 2025 security incidents" becomes a semantic query plus \`date BETWEEN ...\` plus \`tag = security\`.
- **Agentic / iterative retrieval.** The model decides it needs more, searches again with a better query, and repeats. Powerful, unbounded in latency and cost — that is the agents module.`,
    },
    {
      type: 'intuition',
      title: 'The production architecture',
      md: `Two systems that share one index, and must be deployed and scaled separately.

- **Ingestion job** (offline, batch): crawl → parse → chunk → embed → upsert. Runs on a schedule or on a webhook. Must be idempotent and incremental — re-embedding the whole corpus because one page changed is the classic waste. Re-embedding *is* forced when you change the embedding model, so version your index.
- **Query service** (online, per request): the five-step path. Stateless, autoscaled, latency-critical.
- **Semantic cache**: embed the question, and if a previous question sits within a similarity threshold, return the cached answer. Huge win on support-style traffic where the same 200 questions repeat forever. Two rules: key on permission scope, and expire on reindex, or you will serve stale answers with confident citations.
- **Streaming**: send the first token as soon as generation starts, and resolve citation links in parallel. Perceived latency is time-to-first-token, not total time — see the Backend serving module for the SSE/streaming-response mechanics.
- **Latency budget**, order of magnitude, not a benchmark: embed query ~20 ms, vector search ~30 ms, rerank 50 candidates ~100–200 ms, time-to-first-token ~300–800 ms. The reranker is the piece you will be asked to justify or drop; know that it costs roughly a fifth of your budget and usually buys the largest single accuracy jump.
- **Cost per query**: reranker calls + input tokens (the passages dominate — 5 chunks × 400 tokens is 2000 input tokens *per question*) + output tokens. Over-retrieval shows up on the invoice before it shows up in the metrics.`,
    },
    {
      type: 'intuition',
      title: 'Build it: RAG over your own notes',
      md: `The plan's practical, and a genuinely strong portfolio project because it forces every stage to be real.

1. **Ingest** your actual study notes (markdown is kind; add one PDF so you meet the parsing pain honestly). Chunk on headings, 300 tokens with 50 overlap, and store source path plus heading anchor as metadata.
2. **Index** with a local vector store, plus BM25, and fuse. Local means no API key needed to demo it.
3. **Serve** with FastAPI: \`POST /chat\` streaming the answer, returning citations as source path + anchor. This is the line that connects the project to your Backend work — same streaming machinery.
4. **Evaluate**, and this is the part 95% of portfolio RAG projects skip, which is exactly why doing it stands out: 50 golden questions, report recall@5 before and after adding the reranker, and faithfulness before and after adding the "answer only from context" instruction.
5. **README**, written like an engineer, not a tutorial: the architecture diagram, the chunking decision *and why*, the eval table with the four numbers, one paragraph on a failure you found and fixed, and the honest limitations section (no ACLs, single user, corpus size). An interviewer reads that README and has five questions ready — all of which you can answer.`,
    },
    {
      type: 'note',
      md: 'The one-sentence version to keep in your head: **RAG is a search engine wearing a language model as a hat.** Almost every RAG failure is a search failure, and almost every RAG improvement is a search improvement — better parsing, better chunks, hybrid retrieval, reranking, filters. Teams that treat it as a prompt-engineering problem plateau; teams that treat it as an information-retrieval problem ship.',
    },
  ],
  quiz: [
    {
      question: 'Your RAG system answers a question wrongly. Logging shows the passage containing the correct answer was not in the retrieved top-5. What is the most direct fix?',
      options: [
        {
          text: 'Rewrite the generation prompt to be stricter about using context',
          explanation: 'The prompt cannot help — the correct text was never given to the model. Prompt fixes address faithfulness failures, not retrieval misses.',
        },
        {
          text: 'Improve retrieval: hybrid search, better chunking, larger k before reranking, query rewriting',
          explanation: 'Correct. This is a retrieval miss, and retrieval recall is a hard ceiling on end-to-end accuracy. Nothing downstream can recover a passage that was never fetched.',
        },
        { text: 'Switch to a larger generation model', explanation: 'A bigger model reading the wrong passages still answers wrongly — or hallucinates more fluently.' },
        { text: 'Increase the temperature so it explores more', explanation: 'Temperature changes sampling randomness, not what is in the context window. It would make things worse.' },
      ],
      correct: 1,
    },
    {
      question: 'Why is a cross-encoder reranker more accurate than the bi-encoder retriever that fed it?',
      options: [
        { text: 'It uses a bigger embedding dimension', explanation: 'Dimension is not the difference; a cross-encoder does not produce a comparable embedding at all.' },
        { text: 'It is trained on more data', explanation: 'Possibly true in practice, but it is not the structural reason and not what the question is testing.' },
        {
          text: 'It encodes the query and the document TOGETHER, so query tokens attend to document tokens; the bi-encoder compares two independently computed vectors',
          explanation: 'Correct. Joint encoding means full query-document interaction. The cost is that nothing can be precomputed — one forward pass per pair — which is why you only rerank ~50 candidates.',
        },
        { text: 'It runs on the GPU while the retriever runs on the CPU', explanation: 'An implementation detail, and irrelevant — both typically run on GPU.' },
      ],
      correct: 2,
    },
    {
      question: 'A user asks a question and the answer quotes a compensation document they are not authorised to read. Which fix is correct?',
      options: [
        {
          text: 'Apply the ACL filter inside the retrieval query, so forbidden chunks are never scored or returned',
          explanation: 'Correct. Pre-filtering at query time is the only safe design: the document is never loaded, never in a prompt, never in a cache, never in a log.',
        },
        { text: 'Retrieve normally, then drop unauthorised chunks before building the prompt', explanation: 'Post-hoc filtering means the data was already fetched into your process. One bug, one logging line, or one cache write leaks it. This is the pattern that causes real breaches.' },
        { text: 'Add "do not reveal confidential information" to the system prompt', explanation: 'Instructions are not access control. The passage is in the context window and is one prompt injection away from being repeated.' },
        { text: 'Use a smaller k so fewer documents are retrieved', explanation: 'Reduces the probability, not the vulnerability. Security by luck.' },
      ],
      correct: 0,
    },
    {
      question: 'You must choose between finetuning and RAG. The requirement: answers must reflect a policy document that HR edits weekly, and must link to the clause used. What do you pick?',
      options: [
        { text: 'Finetune weekly on the new policy', explanation: 'Retraining weekly is expensive, slow, and still cannot cite a clause or be scoped per user. Facts in weights cannot be pointed at.' },
        { text: 'Finetune once, then patch with prompts', explanation: 'The moment the policy changes, the weights are wrong, and prompt patches do not scale to a changing document.' },
        {
          text: 'RAG — the knowledge changes and must be citable; finetuning changes behaviour, not facts',
          explanation: 'Correct. Changing knowledge, required citations, and per-user permissions are three properties weights cannot provide. Finetuning would only be added later to fix tone or format.',
        },
        { text: 'Neither — use a bigger base model', explanation: 'No base model has your private HR policy, and none can cite it.' },
      ],
      correct: 2,
    },
    {
      question: 'Your eval shows recall@5 = 0.94 but faithfulness = 0.58. Where is the problem?',
      options: [
        { text: 'The chunker — chunks are splitting answers', explanation: 'Chunk splits would show up as poor retrieval recall. Recall is 0.94, so retrieval is fetching the right text.' },
        { text: 'The embedding model is too weak', explanation: 'A weak embedder depresses recall. Recall is high, so the embedder is doing its job.' },
        { text: 'The vector database index is misconfigured', explanation: 'Again a retrieval-side cause, contradicted by recall@5 = 0.94.' },
        {
          text: 'Generation — the right passages are arriving but the answer makes unsupported claims',
          explanation: 'Correct. Faithfulness measures whether claims are grounded in the retrieved text. High recall + low faithfulness means fix the prompt, the passage ordering, or the model — not the retriever. This is precisely why the two halves are measured separately.',
        },
      ],
      correct: 3,
    },
    {
      question: 'What is the "lost in the middle" effect, and what does it imply for prompt assembly?',
      options: [
        { text: 'Middle layers of the transformer lose information; use fewer layers', explanation: 'It is about position in the context window, not depth in the network.' },
        {
          text: 'Models attend less to passages in the middle of a long context, so passages should be ordered with the strongest at the edges',
          explanation: 'Correct. Recall degrades for material buried mid-context. Send fewer, better passages and put the highest-ranked first (and next-highest last) rather than dumping them in retrieval order.',
        },
        { text: 'Chunks in the middle of a document are usually irrelevant', explanation: 'Nothing about document structure implies this; the effect is about position in the prompt.' },
        { text: 'The middle of a chunk gets truncated during embedding', explanation: 'Truncation happens at the end when a chunk exceeds the model max length, and is a different problem.' },
      ],
      correct: 1,
    },
    {
      question: 'In a multi-turn chatbot, the user asks "how much does it cost?" after three turns about vector databases. Embedding that sentence directly retrieves junk. What is the standard fix?',
      options: [
        { text: 'Increase k so something relevant appears', explanation: 'Retrieving more of the wrong neighbourhood does not help; the query vector points at "cost" in general.' },
        { text: 'Concatenate the entire chat history into the query', explanation: 'Better than nothing, but it drags in irrelevant earlier topics and blurs the query vector. It is the crude version of the right answer.' },
        {
          text: 'Query rewriting — use the LLM to turn the follow-up into a standalone query first',
          explanation: 'Correct. "How much does Pinecone cost?" is a searchable query; "how much does it cost?" is not. Query rewriting is effectively mandatory in multi-turn RAG.',
        },
        { text: 'Ask the user to rephrase', explanation: 'It works, and it is why people stop using your product.' },
      ],
      correct: 2,
    },
    {
      question: 'A teammate proposes: "context windows are huge now, let us send the top 50 chunks instead of 5." What is the honest assessment?',
      options: [
        { text: 'Good idea — more context always means better answers', explanation: 'Empirically false. Beyond a point, added passages are noise and accuracy declines.' },
        { text: 'Good idea, but only for the cost', explanation: 'The cost moves the wrong way: passages dominate input tokens, so 50 chunks is roughly 10x the input bill per query.' },
        { text: 'Bad idea — it breaks the citation mechanism', explanation: 'Citations still work with 50 passages; that is not the failure. The failures are dilution, latency and cost.' },
        {
          text: 'Bad idea — dilution and lost-in-the-middle usually cut accuracy, while latency and cost per query rise sharply',
          explanation: 'Correct. Over-retrieval is a real failure mode: signal-to-noise falls, mid-context passages get ignored, and input tokens (the dominant cost) multiply. Reranking to a small, well-ordered set beats dumping everything.',
        },
      ],
      correct: 3,
    },
  ],
  interviewQuestions: [
    {
      question: 'Explain RAG end to end in two minutes, as if to a smart engineer who has never built one.',
      answer:
        'Two pipelines sharing one index. Offline: load and parse the sources, chunk them into 200-500 token units on structure, embed each chunk, and store the vectors with their text and metadata (source, date, ACL) in a vector DB plus a keyword index. Online, per question: embed the query with the same model, retrieve ~50 candidates with hybrid dense+BM25 search under a metadata filter, rerank to ~5 with a cross-encoder, assemble a prompt containing those passages with source labels and an instruction to answer only from context, then generate and return citations. Then say why it exists: training cutoff, private data, hallucination, no citations - RAG fixes all four by moving knowledge from weights into the prompt. Finish with the failure that matters: end-to-end accuracy is capped by retrieval recall.',
      isCaseBased: false,
    },
    {
      question: 'Case: a fintech wants a support assistant. Their product docs change monthly, they have 40k internal pages, answers must cite a source, and different customer tiers may see different documents. RAG, finetuning, or both? Justify.',
      answer:
        'RAG for the knowledge, optionally finetuning later for behaviour. The four requirements each independently rule out putting facts in weights: monthly changes would mean monthly retraining; 40k pages is a retrieval problem, not a memorisation one; citations are impossible from parametric memory; and per-tier visibility needs a per-user filter at query time, which weights cannot express. So: RAG with ACL/tier tags as indexed metadata, filtered inside the query. Where finetuning could still earn its place: a small model finetuned for the house response format and refusal style, which shortens prompts and cuts cost per query - but only after the RAG baseline is measured, and never for the facts. The general rule to state: finetuning teaches behaviour, RAG supplies knowledge; if the right answer changes when a document changes, it is RAG.',
      isCaseBased: true,
    },
    {
      question: 'Design a hallucination-mitigation strategy for a production RAG assistant. Be concrete about layers and what each one costs.',
      answer:
        'Layer it, cheapest first. (1) Retrieval quality, because most "hallucinations" are retrieval misses: hybrid search, a cross-encoder reranker, query rewriting for multi-turn. Free at inference except reranker latency, and the largest single win. (2) Prompt discipline: passages delimited and labelled, an explicit instruction to answer only from context and to say "I do not know" otherwise, strongest passage first. Free. (3) Abstention on weak evidence: if the top reranker score is below a threshold, do not answer - return the closest documents instead. Costs some coverage, and the threshold must be tuned on a golden set. (4) Citation enforcement: require a source tag per claim and reject or regenerate an answer whose citations do not resolve. Cheap and highly visible to users. (5) A faithfulness check as an LLM-as-judge over the answer and its context, run on a sample online and on the whole golden set in CI; a second full LLM call is too expensive for every request. (6) Feedback loop: log question, retrieved ids, answer, and thumbs-down; failed questions become new golden-set entries. Close by naming the tradeoff: every strictness knob trades hallucination against unnecessary refusals, so both must be measured, and abstention rate is a first-class metric, not a bug.',
      isCaseBased: true,
    },
    {
      question: 'Why do you need a reranker if the vector search already ranks by similarity?',
      answer:
        'Because the retriever is a bi-encoder: it embedded the chunk offline, before it had ever seen the query, so a whole passage is compressed into one fixed vector and compared by a single dot product. That is cheap enough to run over millions of chunks and lossy enough to confuse topically adjacent text with the actual answer. A cross-encoder feeds query and passage into one transformer together, so query tokens attend to passage tokens - much more accurate, but nothing can be precomputed, so cost is a forward pass per pair. The stack exists because of that asymmetry: bi-encoder over 10^6 chunks to get 50, cross-encoder over 50 to get 5. In practice reranking is often the single biggest accuracy jump per unit of engineering, at roughly 100-200 ms.',
      isCaseBased: false,
    },
    {
      question: 'Your RAG scores 68% on end-to-end answer correctness. What do you measure next, and why not just improve the prompt?',
      answer:
        'Split the number, because one score does not name a fix. Measure retrieval alone on a golden set: recall@k (was a gold passage in the top-k) and MRR (how high the first correct one ranked). Then measure generation alone, conditioned on gold passages being present: faithfulness (every claim supported by context) and answer relevance. The diagnosis is mechanical: low recall with high faithfulness means fix parsing, chunking, hybrid search and reranking; high recall with low faithfulness means fix the prompt, passage ordering, or the model. Retrieval recall is a hard ceiling - at recall@5 = 0.70 no prompt gets you past 70%. Improving the prompt first is the classic wasted month.',
      isCaseBased: false,
    },
    {
      question: 'Case: users report the assistant answers correctly for short documents but fails on a 200-page policy PDF. Walk through your debugging.',
      answer:
        'Work the pipeline in order and stop at the first broken stage. (1) Look at the parsed text - multi-column layouts interleave, tables become word soup, repeated page headers pollute every chunk. This is the most likely culprit and the one people skip. (2) Look at the chunks themselves, printed, for the failing questions: is the answer split across a boundary? Is a table row separated from its header? (3) Check retrieval on the golden questions: recall@5. If the gold chunk exists but does not rank, try hybrid search - long policy PDFs are full of exact terms like clause numbers that dense retrieval fumbles. (4) If the gold chunk retrieves but the answer is still wrong, check position: with a large document you are probably sending more passages, so lost-in-the-middle and dilution are live. Reorder and cut k. (5) Fix in that order: parser, then chunker (structure-aware, parent-document retrieval so a small chunk retrieves but its whole section is read), then hybrid, then ordering. Nine times in ten on a big PDF, it is the parser.',
      isCaseBased: true,
    },
    {
      question: 'How do you handle permissions in RAG? What is wrong with filtering after retrieval?',
      answer:
        'Every chunk carries its access-control tag as indexed metadata from ingestion day one, and the ACL predicate goes inside the vector search so forbidden chunks are never scored. Post-hoc filtering is broken because by then the document is already in your process: it can be logged, cached, traced, or surfaced by the next bug or prompt injection, and the "drop it" step is one code path among many that can be missed. Pre-filtering means the data never leaves the store. Three follow-ups worth volunteering: a shared answer cache is an ACL bypass unless the cache key includes the permission scope; ACLs must be refreshed on reindex or you enforce last month\'s permissions; and retrofitting permissions onto an index built without them is a full re-ingest, so decide before you build.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the serving architecture for a RAG assistant with 500 requests/minute, a p95 latency target of 2 seconds, and a fixed monthly budget. What do you build and what do you cut?',
      answer:
        'Two deployables. Ingestion is a scheduled batch job - incremental and idempotent, so one changed page re-embeds one page - writing to a versioned index. Query service is stateless and autoscaled. Budget the path: embed query ~20 ms, ANN search ~30 ms, cross-encoder rerank of 50 ~150 ms, time-to-first-token ~500 ms; that fits 2 s p95 with headroom, and the user perceives time-to-first-token because the answer streams. Add a semantic cache in front - support traffic is heavily repeated - keyed on (query embedding bucket, permission scope, index version); a 30% hit rate removes 30% of both latency and token cost. Cost per query is dominated by input tokens, so 5 chunks not 50 is a budget decision as much as an accuracy one. What I cut under pressure: reranking depth first (50 to 25 candidates), multi-query fusion entirely, and the online faithfulness check reduced to a 5% sample. What I never cut: the ACL filter and citations.',
      isCaseBased: true,
    },
    {
      question: 'What is HyDE, and when would you actually reach for it?',
      answer:
        'HyDE - Hypothetical Document Embeddings - asks the LLM to write a plausible answer to the question, embeds that hypothetical answer, and searches with it instead of the question. The rationale is a vocabulary mismatch: a question and the passage that answers it are written differently, but a hypothetical answer and the real answer are written alike, so the vector lands closer to the target. Reach for it when your golden set shows retrieval recall is the bottleneck on questions phrased very differently from the source material - short natural-language questions over formal technical documents. It costs one extra LLM call before retrieval, and it can amplify a confidently wrong hypothesis into a confidently wrong search. Try query rewriting and hybrid search first; both are cheaper and usually enough.',
      isCaseBased: false,
    },
    {
      question: 'How would you choose a chunk size, and what would you do about answers that span a chunk boundary?',
      answer:
        'Do not choose it in the abstract - choose it against the golden set, and measure recall@k for 2-3 candidate configurations. Starting point: 200-500 tokens with 10-20% overlap, split on structure (headings, paragraphs, table rows) rather than fixed character counts, because a chunk is the smallest thing retrieval can ever return. For boundary splits, overlap helps a little and parent-document retrieval helps a lot: index small precise chunks for searching, but return the enclosing section for reading, so you get precision when matching and completeness when generating. Other tactics: prefix each chunk with its document title and heading path so an orphaned chunk still carries context, and for tables keep the header row with every chunk. State the tradeoff explicitly - small chunks retrieve precisely but answer partially, large chunks answer completely but retrieve fuzzily and dilute the prompt.',
      isCaseBased: false,
    },
    {
      question: 'Why hybrid search? Give a case where pure dense retrieval fails and pure keyword search fails.',
      answer:
        'Dense retrieval matches meaning, so it fails on rare exact tokens it never learned a good vector for: error code "ERR_2231", a SKU, an internal service name, a person\'s surname. It will happily return semantically similar but wrong text. Keyword/BM25 matches tokens, so it fails on paraphrase: "how much VRAM does it need" never lexically matches "GPU memory requirements". Hybrid runs both and fuses the ranked lists - reciprocal rank fusion is the boring default, since it needs no score calibration between two incomparable scales. In practice hybrid is close to free, needs no tuning, and is one of the first things to add when recall is the bottleneck. The one cost worth mentioning: two indexes to keep in sync at ingestion.',
      isCaseBased: false,
    },
    {
      question: 'Tell me about a RAG evaluation set. What goes in it, who writes it, and how do you use it?',
      answer:
        '50-100 real questions - taken from actual user logs or support tickets, not invented - each paired with the source passage(s) that answer it and a short reference answer, written by someone who knows the domain rather than by the model. Use it three ways. Retrieval: recall@k and MRR, run on every change to parsing, chunking, embedding model or search config; this is fast, deterministic, and the highest-signal test you have. Generation: faithfulness and answer relevance, scored by LLM-as-judge, run in CI on each prompt change. Regression: keep every question a user complained about, so failures become permanent tests. Two honest caveats: LLM-as-judge scores drift when the judge model changes, so pin the judge version; and a golden set built only from questions your corpus can answer will hide your abstention behaviour, so deliberately include unanswerable questions and check the system says "I do not know".',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why RAG exists (4 reasons)', back: 'Training cutoff, no private data, confident hallucination, no citations. RAG fixes all four by putting the right passages into the prompt at query time.' },
    { front: 'RAG vs finetuning, one line', back: 'Finetuning teaches behaviour (tone, format, task shape); RAG supplies knowledge (facts that change, are private, or must be cited). They compose.' },
    { front: 'The pipeline', back: 'Offline: load, parse, chunk, embed, index. Online: embed query, hybrid retrieve top-50, cross-encoder rerank to 5, assemble prompt with sources, generate with citations.' },
    { front: 'Bi-encoder vs cross-encoder', back: 'Bi-encoder embeds query and doc separately (one dot product, precomputable, cheap, lossy). Cross-encoder reads them together (full interaction, accurate, one forward pass per pair, no precompute).' },
    { front: 'Retrieval miss', back: 'The answer was never in the top-k. The generator cannot fix it. Retrieval recall is a hard ceiling on end-to-end accuracy.' },
    { front: 'Lost in the middle', back: 'Models attend least to the middle of a long context. Send fewer, better passages and order them - strongest first, next-strongest last.' },
    { front: 'Permission leakage, and the fix', back: 'Retrieving a document the user may not see. Fix: put the ACL predicate INSIDE the retrieval query. Never post-hoc filter. Also key any answer cache on permission scope.' },
    { front: 'Evaluate retrieval vs generation', back: 'Retrieval: recall@k, MRR. Generation: faithfulness/groundedness, answer relevance, context precision. Same end-to-end score, opposite fixes - never report one number.' },
    { front: 'Query rewriting', back: 'Turn a chat follow-up ("what about the second one?") into a standalone query using history. Effectively mandatory in multi-turn RAG.' },
    { front: 'Advanced patterns cheat sheet', back: 'HyDE (search with a hypothetical answer), multi-query fusion (paraphrase and fuse), parent-document retrieval (index small, return the section), self-querying (LLM extracts metadata filters), agentic retrieval (iterate).' },
  ],
  mindmapMarkdown: `- RAG End to End
  - Why RAG: cutoff, private data, hallucination, no citations
  - Finetune teaches behaviour, RAG supplies knowledge
  - Ingestion (offline job)
    - Load and parse (PDFs bleed the most time)
    - Chunk 200-500 tok, structure-aware
    - Embed once; index vectors + BM25 + metadata + ACL
  - Query path (online)
    - Embed query with the SAME model
    - Hybrid dense + keyword, retrieve top-50, rerank to 5
    - Assemble prompt, order passages, generate, cite
  - Rerank: bi-encoder cheap and lossy, cross-encoder joint and accurate
  - Failure modes
    - Retrieval miss - the hard ceiling
    - Chunk boundary splits the answer
    - Lost in the middle + over-retrieval dilution
    - Stale or conflicting docs
    - Model ignores context, or over-refuses
    - Permission leak - filter at the query, never post-hoc
  - Evaluation
    - Retrieval: recall@k, MRR
    - Generation: faithfulness, answer relevance, context precision
    - RAGAS family + a golden set of 50-100 real questions
  - Advanced patterns
    - Query rewriting - mandatory in multi-turn
    - HyDE, multi-query fusion, parent-document, self-querying, agentic
  - Production
    - Ingestion job vs stateless query service
    - Semantic cache keyed on permission scope
    - Streaming, latency budget per stage, cost per query
  - Practical: RAG over your notes, FastAPI streaming + eval README`,
}

export default m
