import type { Module } from '../types'

const m: Module = {
  id: 'prep-l0-capstones',
  subjectId: 'prep',
  level: 0,
  title: 'The Four Capstones: Your Portfolio Is Your Interview Story',
  whyItMatters:
    'Everyone in the queue has the same coursework. The four capstones are the only part of your application that is yours. Two of them are built elsewhere on this site; the other two — a RAG system over your own notes with a real eval harness, and its design doc for 1M users — have no other home. This module scopes both, tells you exactly what to measure, and turns a finished repo into answers you can defend under follow-up.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'A project is not a trophy. It is a supply of answers.',
      md: `A resume project has exactly one job: give the interviewer something to dig into where *you* are the world expert in the room.

- The plan names four capstones on purpose. Together they cover DL, GenAI, Backend, ML, DevOps, MLOps and System Design — the whole syllabus, in four artifacts instead of forty.
- **Mini-GPT** — a transformer from scratch, trained on a small corpus, served through a streaming FastAPI endpoint with a simple UI. *(DL + GenAI + Backend)*
- **Full MLOps pipeline** — the grand practical: data versioning, tracking, CI/CD, serving, monitoring, drift-triggered retraining. *(ML + DevOps + MLOps)*
- **RAG study-buddy** — RAG over your own notes, with an eval harness, deployed in Docker. *(GenAI + Backend + DevOps)*
- **Scalable API design doc** — take capstone 3 and write its high-level design for 1M users. *(System Design)*
- Four, not twelve. Depth is the signal; a list of ten half-finished repos reads as ten abandoned projects.`,
    },
    {
      type: 'note',
      md: 'Capstones 1 and 2 already have full build-out modules on this site, so this one gives them a short brief and points at the build. Capstones 3 and 4 are built here, in full. Read the briefs anyway — knowing what each project *proves* is how you decide which one to lead with in a given interview.',
    },
    {
      type: 'intuition',
      title: 'Capstone 1 — Mini-GPT (brief)',
      md: `**What it is.** A decoder-only transformer written line by line in PyTorch: one causal attention head, multi-head, the feed-forward block, pre-norm residuals, embeddings, a training loop, and sampling with temperature/top-k/top-p. Trained on ~1 MB of text, then served behind a streaming FastAPI endpoint with a plain HTML page.

**What it proves.** That you know the architecture at the *line* level, not the diagram level — plus that you can put a model behind a streaming protocol, which is the Backend half of the project and the half most people skip.

**The three questions it lets you answer that nanoGPT-cloners cannot:** why the causal mask is applied *before* softmax, why the initial loss sits near ln(V), and what the residual stream actually carries.

- Build it in the GenAI module *CAPSTONE: Code a GPT from Scratch* — architecture, training loop, sampling and the failure modes are all there.
- The streaming/SSE mechanics live in the Backend module *Production Serving: Workers, Queues, Streaming & ML APIs*.`,
    },
    {
      type: 'intuition',
      title: 'Capstone 2 — Full MLOps pipeline (brief)',
      md: `**What it is.** One repository where Airflow ingests and trains on a schedule, DVC versions the data, MLflow tracks runs and holds the registry stages, Docker plus GitHub Actions ship the model to Kubernetes, Prometheus and Grafana watch the service, Evidently watches the model, and a drift alert triggers a retraining DAG that promotes only if the candidate beats the incumbent.

**What it proves.** That you can *operate* a model, not just fit one. A whole family of standard MLOps questions — reproducibility, data versioning, canary vs blue-green, drift detection, rollback, cost — stops being "I have read about it" and becomes "here is how I did it".

- Build it in the MLOps module *Monitoring, Drift Alerts & the Grand MLOps Capstone* — architecture paragraph, annotated repo layout, and a 10-step build order.
- One rule worth repeating here: **pick a boring dataset on purpose** (churn, taxi duration, energy demand). The dataset is not the project; the pipeline is. A boring dataset stops reviewers arguing about your feature engineering instead of your infrastructure.`,
    },
    {
      type: 'intuition',
      title: 'Capstone 3 — RAG study-buddy: scope it before you touch an editor',
      md: `A question-answering service over *your own study notes*, with citations, packaged in Docker, and — the part that decides whether it is portfolio-grade or a toy — measured.

**In scope (v1):**

- One user, one corpus, one language. Markdown notes plus at least one PDF, so you meet parsing pain honestly.
- Retrieval with citations: every answer shows the source file and heading it came from.
- A fixed evaluation set and a script that scores retrieval and generation *separately*.
- \`docker compose up\` and it runs.

**Explicitly out of scope, and say so in the README:** multi-user auth and per-user access control, incremental re-index on file-watch, conversation memory beyond the last turn, and anything agentic. Naming your non-goals is an engineering signal; pretending you built them is a five-minute-long lie.`,
    },
    {
      type: 'intuition',
      title: 'The corpus: use your own notes, and know why that is the right call',
      md: `The instinct is to grab a public dataset. Resist it — for reasons you can defend out loud.

- **You are the ground truth.** You can tell instantly whether an answer is right, which is exactly what lets you hand-label a golden set in one afternoon. On a public corpus you would be guessing at correctness, and a guessed label makes every metric downstream meaningless.
- **The demo is unfakeable.** An interviewer can ask "what does your note say about LayerNorm?" and watch it retrieve *your* words with *your* file path next to them. A Wikipedia demo could be a cached response; yours obviously is not.
- **It surfaces real parsing problems.** Personal notes have inconsistent headings, code blocks, tables, half-finished lines. That is the mess retrieval systems actually fail on, and fixing it is content for the walkthrough.
- **It is small on purpose.** A few thousand chunks fits in memory, so a brute-force scan is fast and you can defer approximate search until the design doc, where the interesting version of the problem lives.
- One honest limitation to state: a personal corpus means you cannot claim generalisation. Say "measured on my corpus" every time you quote a number. Interviewers respect the qualifier; they punish its absence.`,
    },
    {
      type: 'intuition',
      title: 'The ingest pipeline: load → chunk → embed → index',
      md: `Four stages, offline, idempotent. Each one has a decision you must be able to defend.

1. **Load.** Walk the notes directory, parse markdown and PDF, and carry the *source path plus heading anchor* forward with every piece of text. Metadata attached at load time survives; metadata bolted on later is the single most common source of wrong citations.
2. **Chunk.** State a strategy and write it in the README: **split on headings first, then pack to ~300 tokens with ~50 tokens of overlap, never splitting a fenced code block.** Headings-first respects the document's own structure; 300 tokens is small enough to be precise and large enough to be self-contained; overlap stops a fact that straddles a boundary from being invisible to both neighbours.
3. **Embed.** Batch the chunks, cache by content hash so re-running is cheap, and make it resumable — you will interrupt it. Store the embedding model *name and version* alongside the index; changing the model invalidates every vector you own.
4. **Index.** For a personal corpus, a plain matrix of unit vectors plus a BM25 index is enough, and "enough" is the correct engineering answer at this size. Write the index as a build artifact with a build timestamp, not as a mutable blob you keep patching.

- The technique behind each stage — cosine similarity, the chunk-size tradeoff, hybrid search, ANN when the scan stops working — is in the GenAI modules *Embeddings, Vector Databases & Semantic Search* and *RAG End to End: Retrieve, Rerank, Generate*. Your job in this capstone is the *project*: the decisions, the order, and the proof.`,
    },
    {
      type: 'intuition',
      title: 'The query path: retrieve → rerank → generate',
      md: `Three steps online, and one instruction that does most of the safety work.

- **Retrieve.** Embed the question, take the top ~30 by cosine from the dense index, take the top ~30 from BM25, and fuse the two ranked lists. Hybrid is the highest-value upgrade at this scale because exact terms — a function name, an acronym from your notes — are precisely where pure embeddings miss.
- **Rerank.** Push the fused candidates through a cross-encoder and keep the top 5. This is expensive and it is the piece an interviewer will ask you to justify or drop, so measure it (below) rather than assuming it helps.
- **Generate.** Assemble the 5 chunks with their source paths, and instruct the model to **answer only from the provided context, and to say it does not know when the context does not contain the answer**. Render the citations in the UI as clickable file + heading.
- Stream the response. Perceived latency is time-to-first-token, not total time, and you already own the streaming machinery from capstone 1.
- The detailed mechanics — fusion, cross-encoders, prompt assembly, and the security failure modes — are in *RAG End to End: Retrieve, Rerank, Generate*. Do not re-derive them; cite them and move on to the part nobody does.`,
    },
    {
      type: 'intuition',
      title: 'The eval harness — this is the whole difference',
      md: `Almost no portfolio RAG project has numbers attached to it. That is why having numbers is the cheapest way to stand out, and it takes one afternoon.

- **The fixed question set.** 50–100 questions written by you, from your own notes, each stored with the chunk id(s) that genuinely answer it. One JSONL file, hand-written, committed to the repo. Include a few questions your notes *cannot* answer — those test whether the system refuses instead of inventing.
- **Freeze it.** The set is written *before* you tune anything. A question set edited after seeing results is not a measurement, it is a rationalisation.
- **Score the two halves separately.** Retrieval: **recall@k** (was a gold chunk in the top k?) and **MRR** (how high did the first correct chunk rank?). Generation: **faithfulness / groundedness** (is every claim in the answer supported by the retrieved text?) and answer relevance.
- **Why the split is non-negotiable:** high recall with low faithfulness means fix the prompt; low recall with high faithfulness means fix the chunker and the retriever. Identical end-to-end scores, opposite fixes. And recall is a hard ceiling — if recall@5 is 0.70, no generator alive takes you past 70%.
- **Run it per configuration and commit the results.** Each change gets a row: baseline, +heading-aware chunking, +hybrid, +reranker, +grounding instruction. That table is the artifact that turns "it seemed good" into "I measured it".
- The metric definitions and the LLM-as-judge setup (including the biases that make naive judging worthless) are in the GenAI modules *RAG End to End: Retrieve, Rerank, Generate* and *Evaluating LLMs: Judges, Hallucination, Guardrails & Multimodal*.`,
    },
    {
      type: 'note',
      md: 'The README table, as a template — fill it from YOUR runs, and never from a number you did not measure. Columns: *configuration · recall@5 · MRR · faithfulness · p95 latency*. Rows: `baseline (fixed 500-token chunks, dense only)` · `+ heading-aware 300/50 chunking` · `+ BM25 hybrid` · `+ cross-encoder rerank` · `+ grounded prompt`. One extra column earns you more credit than all the others combined: **delta** — what each change actually bought. A change with a delta near zero that you kept anyway is a question you will be asked; a change with a delta near zero that you *removed* is a story you get to tell.',
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Build order: dumb skeleton first, then one upgrade at a time',
        notice:
          'Left = the step you are doing. Right = what exists in the repo after it. Step through once for the order; step through again reading only the right column, and notice that something runnable exists from frame 1 onward. Frame 2 is the fork almost everyone takes.',
        leftLabel: 'Build step',
        rightLabel: 'What exists after it',
        frames: [
          {
            note: 'Day one. Deliberately dumb, end to end. Twenty notes, no chunking, cosine over a NumPy matrix, top-3 pasted into a prompt, one FastAPI route. It is ugly and it answers a question.',
            stack: [
              { name: 'goal', value: 'something runnable' },
              { name: 'retriever', value: 'brute-force cosine' },
            ],
            heap: [
              { id: 'app', value: 'app/main.py', label: 'POST /chat -> an answer' },
              { id: 'idx', value: 'index/ (20 whole files)', label: 'no chunking yet' },
            ],
          },
          {
            note: 'The fork in the road. The tempting move: HyDE, multi-query fusion and a fancy reranker, right now, because they are the interesting part. There is no scoreboard, so every one of these is a guess you will defend with a feeling.',
            stack: [
              { name: 'next step', value: 'fanciest retriever', danger: true },
              { name: 'evidence it helps', value: 'none', danger: true },
            ],
            heap: [
              {
                id: 'fancy',
                value: 'HyDE + fusion + rerank',
                label: 'three weeks of work, zero measured effect',
                danger: true,
              },
              { id: 'gold0', value: 'eval/golden.jsonl', label: 'still does not exist', danger: true },
            ],
          },
          {
            note: 'The correct step 2: write the golden set BEFORE tuning anything. 60 questions from your own notes, each with the chunk id that answers it. One afternoon. Every later change now has a number attached.',
            stack: [
              { name: 'questions', value: '60, hand-written' },
              { name: 'frozen', value: 'yes — before tuning' },
            ],
            heap: [
              { id: 'gold', value: 'eval/golden.jsonl', label: 'question + gold chunk ids' },
              { id: 'run', value: 'eval/run_eval.py', label: 'recall@k, MRR, faithfulness' },
              { id: 'base', value: 'results/baseline.json', label: 'the number everything is compared to' },
            ],
          },
          {
            note: 'Chunking upgrade: heading-aware, ~300 tokens, ~50 overlap, code blocks kept whole. Re-run the harness. Either recall@5 moves or you just learned your corpus does not care — both are results.',
            stack: [
              { name: 'strategy', value: 'headings -> 300/50' },
              { name: 'verdict', value: 'read from delta' },
            ],
            heap: [
              { id: 'chunk', value: 'ingest/chunk.py', label: 'ONE place that defines a chunk' },
              { id: 'r1', value: 'results/chunk_v2.json', label: 'delta vs baseline' },
            ],
          },
          {
            note: 'Hybrid retrieval: add BM25 and fuse the two ranked lists. Re-run. This is usually the largest single jump on a personal corpus full of exact terms — acronyms, function names, your own shorthand.',
            stack: [
              { name: 'dense', value: 'top 30' },
              { name: 'bm25', value: 'top 30' },
              { name: 'fused', value: 'top 30' },
            ],
            heap: [
              { id: 'ret', value: 'app/retrieve.py', label: 'dense + lexical, fused' },
              { id: 'r2', value: 'results/hybrid.json', label: 'recall@5, MRR, delta' },
            ],
          },
          {
            note: 'Now the reranker — after there is something to prove it against. Cross-encoder over the 30 fused candidates, keep 5. Measure the accuracy gain AND the latency cost, then decide. Keeping it is fine; keeping it without knowing the price is not.',
            stack: [
              { name: 'candidates', value: '30 -> 5' },
              { name: 'cost', value: 'measured, not assumed' },
            ],
            heap: [
              { id: 'rr', value: 'cross-encoder rerank', label: 'kept only if the delta justifies p95' },
              { id: 'r3', value: 'results/rerank.json', label: 'accuracy delta + latency delta' },
            ],
          },
          {
            note: 'Generation quality: the "answer only from the context, else say you do not know" instruction, plus citations rendered in the UI. Measure faithfulness before and after. This is where the refusal questions in your golden set earn their place.',
            stack: [
              { name: 'prompt', value: 'grounded + cite' },
              { name: 'metric', value: 'faithfulness' },
            ],
            heap: [
              { id: 'gen', value: 'app/generate.py', label: 'context-only instruction' },
              { id: 'cite', value: 'source path + heading', label: 'clickable in the UI' },
            ],
          },
          {
            note: 'Package it. Dockerfile, docker compose up, a Makefile with ingest/eval/up, .env.example with names and no values, and a README carrying the diagram, the eval table and the limitations. Only now do you touch the fancy retrievers — with a scoreboard that can tell you whether they helped.',
            stack: [
              { name: 'run', value: 'docker compose up' },
              { name: 'proof', value: 'eval table in README' },
            ],
            heap: [
              { id: 'dock', value: 'Dockerfile + compose', label: 'one command, no local setup' },
              { id: 'readme', value: 'README.md', label: 'diagram, decisions, numbers, limits' },
            ],
          },
        ],
      },
    },
    {
      type: 'code',
      lang: 'bash',
      title: 'Repo layout — every path has one job',
      code: `study-buddy/
├── app/
│   ├── main.py            # FastAPI: POST /chat (streams), GET /healthz
│   ├── retrieve.py        # dense + BM25 fusion, then cross-encoder rerank
│   ├── generate.py        # prompt assembly + "answer only from context"
│   └── settings.py        # one settings object; no magic literals in code
├── ingest/
│   ├── load.py            # walk notes/, parse md + pdf, keep path + heading
│   ├── chunk.py           # heading-aware, ~300 tok, ~50 overlap
│   ├── embed.py           # batched, cached by content hash, resumable
│   └── build_index.py     # writes index/ — idempotent, safe to re-run
├── eval/
│   ├── golden.jsonl       # 60 questions + gold chunk ids — hand written
│   ├── run_eval.py        # recall@k, MRR, faithfulness -> results/*.json
│   └── results/           # one file per configuration, committed
├── notes/                 # the corpus — gitignored; sample_notes/ is committed
├── index/                 # build artifact — gitignored, rebuilt by make ingest
├── tests/
│   └── test_chunk.py      # boundaries, overlap, metadata survives the split
├── .env.example           # the NAMES of the secrets, never the values
├── Dockerfile
├── docker-compose.yml     # api + (optional) local embedding/model service
├── Makefile               # make ingest / make eval / make up
└── README.md              # diagram, eval table, decisions, limitations`,
      annotations: {
        3: 'One route that streams, one health check. Resist adding endpoints nobody calls — a reviewer counts the ones that work, not the ones that exist.',
        6: 'Chunk size, overlap, top-k, rerank depth and the model name all live here. When an interviewer asks "what happens if you double the chunk size?", you want to answer by pointing at one file.',
        8: 'Attach source path and heading anchor HERE, at load time. Metadata added after splitting is how you get answers that cite the wrong section while your retrieval metrics look perfect.',
        9: 'The single definition of a chunk in the whole repo. If ingest and eval can disagree about what a chunk is, your gold chunk ids stop meaning anything.',
        10: 'Cache on the hash of the chunk text. Re-ingesting after a one-file edit should cost seconds, not a full re-embed — and this is exactly the incremental-ingest argument you will make in the design doc.',
        13: 'Sixty lines of hand-written JSONL is the single highest-leverage file in the repo. It is also the file that proves you did engineering rather than prompt-fiddling.',
        14: 'Retrieval metrics and generation metrics computed by the same script, reported separately, dumped to JSON so the README table is generated rather than typed.',
        16: 'Gitignore your real notes; commit a small sample corpus so a stranger can clone and run it. A demo nobody can start is a screenshot.',
        20: 'Secrets never enter the repo. .env.example lists key names with empty values, .env is gitignored, and the README says which provider each key is for.',
        23: 'Three targets is the whole interface: make ingest, make eval, make up. A reviewer who has to read your code to learn how to run it will not run it.',
        24: 'Graded harder than the code. Architecture diagram, the chunking decision AND why, the eval table with deltas, one failure you found and fixed, and an honest limitations section.',
      },
    },
    {
      type: 'intuition',
      title: 'Packaging: one command, or it does not exist',
      md: `The gap between "my project works" and "a stranger can see it work" is where most portfolios die.

- **\`docker compose up\` starts everything.** API, and whatever local model or embedding service you use. If it needs an API key, the compose file reads it from \`.env\` and the README says exactly which key.
- **Ship a sample corpus.** \`sample_notes/\` with a handful of committed markdown files, so a clone-and-run works before anyone supplies data.
- **Two-stage Dockerfile, and pin your versions.** The index is *built*, not baked: \`make ingest\` writes \`index/\`, mounted as a volume. Baking a 2 GB index into an image is how a 200 MB service becomes unshippable.
- **A health check that means something.** \`/healthz\` should confirm the index loaded and the model is reachable, not just that Python started.
- **The README's first code block is the run command.** Then the exact \`curl\` that returns an answer. A reviewer who cannot get output in five minutes stops.
- Docker layer behaviour, image size and the multi-stage build are covered in the MLOps module *Docker: Images, Layers & Containerizing an ML API*.`,
    },
    {
      type: 'note',
      md: 'The five-minute demo, in order: (1) `docker compose up`, then one curl that returns a cited answer — proves it runs. (2) Ask a question whose answer lives in a *code block* in your notes — proves the parser is real. (3) Ask something your notes do not cover and show it refusing instead of inventing — proves the grounding instruction works and is the moment most demos fail. (4) Open the README eval table and walk the deltas — proves you measured. (5) Name one thing you would fix first. Five minutes, five claims, every one of them verifiable on screen.',
    },
    {
      type: 'note',
      md: 'The failure modes that make a RAG project look amateur, in the order reviewers notice them. **(1) No eval.** "It works well" with nothing behind it — the fatal one, and the reason the golden set comes before the tuning. **(2) Chunk size never tuned.** A single fixed 500-token split with no experiment says you never questioned the default. **(3) No citation display.** An answer with no visible source is indistinguishable from the model guessing, and it removes the one feature RAG exists to provide. **(4) Secrets in the repo.** An API key in git history is an instant, unrecoverable negative signal — and rotating it later does not remove it from history. **(5) A README with no numbers and no limitations** — it reads as a tutorial that was followed rather than a system that was built. **(6) Re-embedding the whole corpus on every run**, which quietly announces you never thought about incremental ingest.',
    },
    {
      type: 'intuition',
      title: 'Capstone 4 — the design doc. It is a writing deliverable, and that is the point.',
      md: `Take capstone 3 — the thing you actually built for one user — and write the high-level design that would serve 1M. No code. That is not a shortcut; it is the skill being trained.

- Senior engineers are hired to *write the document that gets a system agreed on*. Design docs, RFCs and one-pagers are the medium in which real architecture decisions are made, and almost no candidate has one to show.
- It is also the cheapest capstone you own: no infrastructure, no bill, no bugs. A weekend of writing produces an artifact you can attach to an application.
- And it converts a small project into a big conversation. "I built it for one user; here is what breaks at a million, and here is which of those problems I would solve first" is a far stronger position than either half alone.
- Length target: **6–10 pages.** Under three pages is a sketch. Over twenty and nobody reads past the estimation section.`,
    },
    {
      type: 'intuition',
      title: 'The document structure — and roughly how long each part gets',
      md: `Same skeleton every time, so you never lose your place. Page counts assume a ~8-page doc.

1. **Context and goals** (½ page) — what exists today, what problem the change solves, and 3–5 measurable goals.
2. **Non-goals** (5 lines) — what you are deliberately not solving. The most-skipped and most-respected section.
3. **Requirements** (½ page) — functional (what it does) and non-functional (latency target, availability, durability, privacy, cost ceiling). Non-functional requirements are what actually pick the architecture.
4. **Estimation** (1 page) — the arithmetic, visible. Numbers you can defend, not numbers you remember.
5. **API** (½ page) — the two or three endpoints, request and response shapes, and the streaming decision.
6. **Data model** (½ page) — the stores, and one sentence per store naming the query it exists to serve.
7. **Architecture** (1 page + diagram) — boxes and arrows, data flowing left to right, and the request path traced once in prose.
8. **Deep dives** (1 page each, pick 2–3) — the genuinely hard parts. This is the bulk of the doc and the part that gets read closely.
9. **Failure modes** (½ page) — what breaks, what the user sees, what the system does about it.
10. **Rollout** (½ page) — how this ships without a big-bang cutover; how you roll back.
11. **Cost** (½ page) — the monthly bill, per unit, and the two biggest levers.
12. **Open questions and alternatives considered** (½ page) — what you did not choose, and why.`,
    },
    {
      type: 'intuition',
      title: 'How a doc differs from a 45-minute whiteboard round',
      md: `Same content, different contract. Three things change, and all three make the doc harder.

- **You get to be precise, so you must be.** On a whiteboard "we'll shard by user" is a fine sentence. In a document it needs the shard key, the rebalancing story, and what a cross-shard query costs. Vagueness that survives a conversation is visible in text.
- **Every number must be defended in place.** No hand-waving past an estimate, because the reader can stop and check your arithmetic. Write the assumption next to the number: "20% DAU (assumed; note-taking apps skew low)". An unlabelled number is a number a reviewer will not trust.
- **You must state what you did NOT choose.** The whiteboard round rewards a working design; the doc rewards a *decided* design. "Considered a global ANN index; rejected because queries are per-user and a per-user scan is already sub-millisecond" is the sentence that separates a design doc from a description.
- One more, easy to miss: a doc has to survive being read by someone who is not in the room. If a section only makes sense with you narrating it, rewrite the section.`,
    },
    {
      type: 'intuition',
      title: 'Worked skeleton, part 1 — context, non-goals, requirements',
      md: `Written for the study-buddy at 1M users. Copy the shape, not the words.

- **Context.** A single-user RAG service over personal markdown notes, currently one container and a locally built index. We want to offer it as a hosted product to 1M registered users, each with a private corpus.
- **Goals.** (1) p95 answer time-to-first-token under 1.5 s. (2) Each user's notes are readable only by that user. (3) A note edited is searchable within 5 minutes. (4) Cost per active user per month under \$1.
- **Non-goals.** Team/shared corpora. Real-time collaborative editing. Cross-user search. Offline mode. Fine-tuning per user. Anything agentic.
- **Functional requirements.** Upload/sync notes; ask a question; receive a streamed, cited answer; delete a corpus and have it actually gone.
- **Non-functional requirements.** 99.9% availability on the query path (ingest may lag). Hard tenant isolation. Durable corpora — losing a user's notes is unrecoverable. A stated cost ceiling.
- Notice which requirement is doing the work: **hard tenant isolation** is not a security footnote, it is the constraint that later kills the global index and makes semantic caching almost useless. Find that requirement early in every design; it is the one the whole architecture bends around.`,
    },
    {
      type: 'intuition',
      title: 'Worked skeleton, part 2 — the estimation, arithmetic visible',
      md: `State every assumption, then multiply in the open. Round hard; the shape matters, the third digit does not.

**Assumptions (all stated, all arguable):** 1M registered users · 20% daily active = 200,000 DAU · 10 questions per active user per day · average corpus 1,000 chunks per user · chunk ≈ 300 tokens ≈ 1.2 KB of text · embedding dimension 768.

- **Traffic.** 200,000 × 10 = 2,000,000 questions/day. Divide by 86,400 → **23 QPS average**. Peak factor 4× (people study in the evening) → **≈ 93 QPS peak**. That is a small number, and saying so is the point: this is not a traffic problem.
- **Corpus size.** 1M users × 1,000 chunks = **10⁹ chunks.**
- **Embedding storage.** 768 dims × 4 bytes = 3,072 B per vector. 10⁹ × 3,072 B = **3.07 TB** of vectors, plus 10⁹ × 1.2 KB = **1.2 TB** of chunk text, plus ~200 B of metadata each = **0.2 TB**. Total ≈ **4.5 TB.** Cheap on object storage, expensive in RAM.
- **Index memory.** Holding all vectors resident is 3.07 TB — roughly 24 machines at 128 GB, before any graph overhead (an HNSW graph at M=16 adds ~128 B per vector = another 128 GB). But queries are *per-user*: only the working set must be hot. 200,000 DAU × 1,000 chunks × 3,072 B = **614 GB ≈ 5 machines at 128 GB.** int8 quantization (768 B per vector) cuts that to ~154 GB — one machine, with a recall loss you must then measure.
- **LLM tokens.** Per query: 5 chunks × 300 tokens + ~200 tokens of question and system prompt = **1,700 input tokens**, ~300 output. Monthly: 2M/day × 30 = 60M queries → 60M × 1,700 = **1.02 × 10¹¹ input tokens** and 60M × 300 = **1.8 × 10¹⁰ output tokens**.
- **LLM cost.** At an assumed \$0.50 per million input and \$1.50 per million output tokens (substitute your provider's current published rates — this is the arithmetic, not a quote): 102,000 M × \$0.50 = **\$51,000** + 18,000 M × \$1.50 = **\$27,000** = **≈ \$78,000/month**, which is \$0.0013 per query and **\$0.39 per DAU per month.**
- **Embedding cost, for contrast.** One-time ingest: 10⁹ chunks × 300 tokens = 3 × 10¹¹ tokens; at \$0.02/M that is **≈ \$6,000, once.** Query embeddings: 60M × ~30 tokens = 1.8 × 10⁹ tokens ≈ **\$36/month** — a rounding error. Ingest is capital; generation is rent.`,
    },
    {
      type: 'math',
      intro: 'The same estimation as formulas — this is the block you reproduce on a whiteboard when someone asks where a number came from.',
      latex: [
        '\\text{QPS}_{\\text{avg}} = \\frac{200{,}000 \\times 10}{86{,}400} = \\frac{2\\times10^{6}}{86{,}400} \\approx 23 \\quad\\Longrightarrow\\quad \\text{QPS}_{\\text{peak}} \\approx 4 \\times 23 \\approx 93',
        'N_{\\text{chunks}} = 10^{6}\\,\\text{users} \\times 10^{3}\\,\\frac{\\text{chunks}}{\\text{user}} = 10^{9}, \\qquad S_{\\text{vec}} = 10^{9} \\times 768 \\times 4\\,\\text{B} = 3.07\\,\\text{TB}',
        'S_{\\text{hot}} = 200{,}000 \\times 10^{3} \\times 3072\\,\\text{B} \\approx 614\\,\\text{GB} \\;\\Longrightarrow\\; \\approx 5 \\text{ boxes at } 128\\,\\text{GB}',
        'T_{\\text{in}} = 6\\times10^{7} \\times 1700 = 1.02\\times10^{11}, \\qquad T_{\\text{out}} = 6\\times10^{7} \\times 300 = 1.8\\times10^{10}',
        '\\text{Cost}_{\\text{mo}} = \\frac{1.02\\times10^{11}}{10^{6}}\\cdot\\$0.50 \\;+\\; \\frac{1.8\\times10^{10}}{10^{6}}\\cdot\\$1.50 = \\$51{,}000 + \\$27{,}000 = \\$78{,}000',
        '\\text{Cost per DAU} = \\frac{\\$78{,}000}{200{,}000} = \\$0.39/\\text{month} \\quad (\\text{goal was} < \\$1 \\Rightarrow \\text{met, with } 2.5\\times \\text{ headroom})',
      ],
    },
    {
      type: 'intuition',
      title: 'What those numbers decided — the paragraph that proves the estimation was not decoration',
      md: `An estimation section that does not change a single design choice was a waste of a page. Say what each number ruled out.

- **93 peak QPS ruled out a distributed-systems answer.** At that rate the query service is a handful of stateless containers behind a load balancer. Anyone who arrives at "Kafka and a service mesh" for 93 QPS has not done the arithmetic.
- **Per-user isolation ruled out the global ANN index.** A query touches one user's ~1,000 vectors: 1,000 × 768 ≈ 768,000 multiply-adds, comfortably sub-millisecond on one core. A billion-vector HNSW graph would be more machinery, more memory and *worse* isolation. This is the single best sentence in the doc, because it rejects the obvious impressive answer with a number.
- **614 GB of hot vectors chose the storage tier.** Cold corpora live in object storage; a user's shard is paged into a memory cache on first question and evicted on idle. First question of the day is slower — state that as a known tradeoff and put a number on it.
- **\$0.39 per DAU met the \$1 goal with headroom**, which is what licenses the reranker's extra latency and cost. If the number had come out at \$4, the doc's deep dive would have been "how to cut generation cost" instead.
- **Cost sensitivity, stated as a lever:** input tokens are 65% of the bill, and the passages dominate the input. Dropping from 5 chunks to 3 removes ~600 input tokens per query — roughly a 35% cut in input spend — *at a recall cost you must measure*, which is exactly the harness you already built in capstone 3.`,
    },
    {
      type: 'intuition',
      title: 'Worked skeleton, part 3 — the rest of the doc',
      md: `Shorter sections, same discipline: one decision per paragraph, one reason per decision.

- **API.** \`POST /v1/chat\` — body \`{question, corpus_id}\`, response streamed as server-sent events, ending with a citations array. \`POST /v1/documents\` for sync, \`DELETE /v1/corpus/{id}\` because deletion is a requirement and it must also purge vectors, cache and any logged text.
- **Data model.** Four stores, one query each: object storage for raw documents (durability); a per-user vector shard (retrieval); a relational store for users, corpora and document metadata (the boring queries); a cache for hot shards and sessions (latency).
- **Architecture.** Two systems sharing one artifact: an **ingest pipeline** (queue-driven, idempotent, incremental — re-embed only chunks whose content hash changed) and a **query service** (stateless, autoscaled, latency-critical). They scale independently because their load shapes are unrelated.
- **Deep dive 1 — tenant isolation.** The shard key is the corpus id; it is applied at the storage layer, not as a filter in application code, so an application bug cannot leak across tenants. Deletion propagates to shard, cache and logs. Say plainly which logs contain user text and how long they live.
- **Deep dive 2 — incremental ingest.** Content-hash every chunk; a document edit re-embeds only the changed chunks. Without this, the 5-minute freshness goal turns into a full re-embed and the bill from the estimation section is wrong by orders of magnitude.
- **Failure modes.** LLM provider down → serve retrieved passages with citations and no synthesis, clearly labelled (degraded, not broken). Vector shard unavailable → fall back to BM25 and say so in the response. Ingest backlog → freshness SLO breached; surface a "last indexed at" timestamp rather than silently serving stale results.
- **Rollout.** Ship ingest behind a flag first and backfill; then dual-run retrieval (old path serves, new path is scored offline against the golden set) before any traffic moves; then a 5% canary. Rollback is a flag flip, and the old index stays intact until the canary graduates.`,
    },
    {
      type: 'note',
      md: '**Alternatives considered — write this section last and never skip it.** Three entries, each one sentence of choice plus one of reason. *A single global ANN index across all users* — rejected: queries are per-tenant, a per-user scan is already sub-millisecond, and a shared index weakens isolation. *A managed vector database* — a real option; rejected here because per-user shards are small and the operational simplicity does not pay for the per-vector price at 10⁹ vectors, and this is a judgement call that could reasonably go the other way. *A cross-user semantic cache* — rejected: notes are private, so a cross-user hit is a data leak; caching stays inside a single corpus, where the hit rate is honestly low. A doc without this section describes a system. A doc with it demonstrates that you chose one.',
    },
    {
      type: 'intuition',
      title: 'Turning a project into a story: the resume line',
      md: `One line, three parts: **what it does · the number that proves it · the stack.** No adjectives.

- **Weak:** "Built a RAG chatbot using LangChain, OpenAI and a vector database." Names tools, proves nothing, and invites questions about libraries instead of about you.
- **Stronger:** "RAG study assistant over ~1,200 pages of personal notes; hybrid retrieval + cross-encoder rerank raised recall@5 from *[your baseline]* to *[your result]* on a hand-labelled 60-question set; FastAPI + Docker, one-command run."
- The placeholders are literal: **fill them from your own eval run, and from nothing else.** A number you cannot reproduce on demand is worse than no number, because the follow-up is always "how did you measure that?"
- The number does not have to be impressive. It has to be *real and explained*. "recall@5 went from 0.61 to 0.78, and faithfulness barely moved, which told me my bottleneck was retrieval not generation" is a strong line even though neither number is remarkable.
- One line per project, four projects, and the design doc gets a line too: "Wrote the 1M-user HLD for it — estimation, per-tenant sharding, \$0.39/DAU cost model." Attach the PDF.`,
    },
    {
      type: 'intuition',
      title: 'The 2-minute walkthrough — rehearse it out loud, with a timer',
      md: `"Tell me about this project" is not an invitation to talk for ten minutes. Two minutes, then stop and let them steer.

- **0:00–0:15 — what and for whom.** One sentence. "It answers questions about my own study notes and shows you which note it came from."
- **0:15–0:35 — why it is not trivial.** Name the one hard constraint. "The hard part is not calling a model, it is knowing whether retrieval actually found the right paragraph."
- **0:35–1:15 — the architecture, data flowing one way.** Four or five boxes maximum: ingest → chunk → embed → index; question → hybrid retrieve → rerank → grounded generate → cited answer. Trace one question through it.
- **1:15–1:40 — the measurement.** What you measured, on what set, what it said, and what you changed because of it.
- **1:40–2:00 — the honest limitation and what you would do next.** "Single user, no access control — which is exactly what the design doc addresses."
- Then **stop talking.** The silence is where they choose which thread to pull, and every thread you left is one you already prepared. Rambling past two minutes buries the parts you wanted them to ask about.`,
    },
    {
      type: 'intuition',
      title: 'The "hardest bug" answer — six beats, and one bug worth picking',
      md: `This question is testing debugging *method*, not the bug. Pick something with a diagnosis, never "a dependency was missing".

The six beats: **symptom → what I believed → how I checked → what was actually true → the fix → what I changed so it cannot recur.**

A worked example of the shape — write yours from your own repo, with your own bug:

- **Symptom.** Answers were correct, but the citation under them pointed at the wrong section of my notes.
- **What I believed.** Retrieval was wrong. But recall@5 on the golden set was healthy, which contradicted that.
- **How I checked.** Printed the retrieved chunk text next to its stored heading for ten questions by hand. The *text* was right every time; the *heading* was one section ahead.
- **What was actually true.** The heading metadata was attached after splitting, so each chunk inherited the heading of the section that followed it. Retrieval metrics could not see it — they match on chunk text, and the text was fine.
- **The fix.** Attach metadata at load time, before the split.
- **What changed so it cannot recur.** A test asserting that a chunk's stored heading appears in its own source region, plus one line in the eval script that samples five citations for manual review.
- The beat that scores the most is the fourth: *my metric was blind to this class of bug*. Naming a limitation of your own measurement is the most senior thing you can say about a project.`,
    },
    {
      type: 'note',
      md: 'Interviewers probe **depth** on whatever you list, and they choose the item, not you. Put Kafka on your resume and you will be asked about consumer groups and rebalancing; put "vector database" and you will be asked what an HNSW parameter does to recall. So the rule is blunt: **listing something you cannot defend is worse than listing nothing**, because it turns a neutral blank into a demonstrated gap — and it makes the rest of your claims suspect. The self-test for every line: can you answer "why this and not the obvious alternative?", "what broke while you built it?", and "what changes at 10× the load?" Three yeses, it stays. One no, cut the line or spend a weekend earning it.',
    },
    {
      type: 'note',
      md: 'These four projects are also the raw material for your behavioral round. The plan asks for eight STAR stories — conflict, failure, ambiguity, deadline, leadership — and you do not need a corporate job to have them: the reranker you built and then deleted because the delta did not justify the latency is a *judgement under ambiguity* story; the citation bug your own metric could not see is a *failure* story with a real recovery; scoping the study-buddy to one user is a *deadline and prioritisation* story. Mine them in the module *Behavioral Interviews: Eight STAR Stories From Your Own Work* — build the capstones first, and that module becomes a writing exercise rather than an invention exercise.',
    },
  ],
  quiz: [
    {
      question: 'You have four weekends for the RAG study-buddy. Which build order is stronger, and why?',
      options: [
        {
          text: 'Perfect the retriever (HyDE, multi-query fusion, reranking) first, then wire up an API and Docker at the end',
          explanation:
            'This is the classic failure. Every retrieval choice is a guess with no scoreboard, and the project reaches week four with no runnable system — the state most abandoned portfolio projects die in.',
        },
        {
          text: 'Dumb end-to-end skeleton on day one, then the golden set, then one measured upgrade at a time',
          explanation:
            'Correct. Something runnable exists from day one, and every later change is an upgrade to a working system with a number attached to it.',
        },
        {
          text: 'Write the eval harness first, before any retrieval code exists',
          explanation:
            'Close, but you cannot pick gold chunk ids before a chunker exists. The skeleton comes first precisely so the golden set has something to point at.',
        },
        {
          text: 'Build the Docker packaging and CI first, so deployment is never a surprise',
          explanation:
            'Deployment-first is right for the MLOps capstone where infrastructure IS the project. Here the project is retrieval quality, and packaging with nothing to package is scaffolding.',
        },
      ],
      correct: 1,
    },
    {
      question: 'Your golden set reports recall@5 = 0.95 and faithfulness = 0.58. What do you fix?',
      options: [
        {
          text: 'The chunker — chunks are clearly too large',
          explanation:
            'Retrieval is finding the gold passage 95% of the time, so the chunker is doing its job. Changing it here risks breaking the half that works.',
        },
        {
          text: 'The embedding model — switch to a larger one',
          explanation: 'Also a retrieval fix, and retrieval is not the problem. This is money and latency spent on the healthy half.',
        },
        {
          text: 'The prompt and generation step — the right context is arriving and the model is not staying inside it',
          explanation:
            'Correct. High recall with low faithfulness isolates the fault to generation: add the "answer only from the provided context" instruction and citations, then re-measure.',
        },
        {
          text: 'Nothing — 0.95 recall means the system is working',
          explanation:
            'Half the system is working. Faithfulness at 0.58 means roughly two in five claims are unsupported — the exact failure RAG exists to prevent.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Which resume line is stronger for the same project?',
      options: [
        {
          text: '"RAG assistant over 1,200 pages of personal notes; hybrid + rerank raised recall@5 from 0.61 to 0.78 on a hand-labelled 60-question set; FastAPI + Docker."',
          explanation:
            'Correct. What it does, the number that proves it, the stack — and the number names its own measurement method, which pre-answers the first follow-up.',
        },
        {
          text: '"Built a production-grade, highly scalable AI-powered knowledge assistant leveraging state-of-the-art LLMs."',
          explanation: 'Adjectives with no verifiable claim. "Production-grade" and "highly scalable" are exactly the words an interviewer will ask you to substantiate.',
        },
        {
          text: '"Implemented RAG with LangChain, Pinecone, OpenAI, FAISS, Streamlit, Docker and Kubernetes."',
          explanation:
            'A tool list invites depth probes on seven technologies at once. Every one you cannot defend converts into a demonstrated gap.',
        },
        {
          text: '"Achieved 94% accuracy on a RAG chatbot."',
          explanation:
            'Accurate at what — retrieving or writing? An unsplit, unsourced number reads as invented, and "how did you measure that?" ends badly.',
        },
      ],
      correct: 0,
    },
    {
      question: 'In the 1M-user design doc, why does the estimation kill the idea of one global ANN index over all 10⁹ vectors?',
      options: [
        { text: 'Because 93 peak QPS is too much load for an ANN index', explanation: 'Backwards — 93 QPS is trivial for an ANN index. Traffic is not the constraint anywhere in this design.' },
        { text: 'Because approximate search always loses too much recall', explanation: 'Not a general truth, and not the argument here. ANN recall loss is tunable and measurable.' },
        { text: 'Because 3.07 TB of vectors cannot fit on any machine', explanation: 'It cannot fit on one machine, but that alone would just mean sharding it. The isolation argument is what actually decides it.' },
        {
          text: 'Because every query is scoped to one tenant, so a per-user scan of ~1,000 vectors (768k multiply-adds) is already sub-millisecond — and a shared index weakens isolation',
          explanation:
            'Correct. The requirement (hard tenant isolation) plus the arithmetic (768,000 multiply-adds is sub-millisecond) rejects the impressive answer with a number. That is the sentence the doc exists for.',
        },
      ],
      correct: 3,
    },
    {
      question: 'Your notes corpus has one document with a long fenced code block. Which chunking decision is more defensible?',
      options: [
        { text: 'Fixed 500-token windows with no overlap, applied uniformly', explanation: 'Uniform windows split the code block mid-function, and with no overlap a fact straddling a boundary becomes invisible to both neighbours.' },
        {
          text: 'Split on headings first, pack to ~300 tokens with ~50 overlap, and never split a fenced code block',
          explanation:
            'Correct. Headings respect the document\'s own structure, 300 tokens is precise yet self-contained, overlap covers boundaries, and keeping code whole prevents retrieving half a function.',
        },
        { text: 'One chunk per document, so no context is ever lost', explanation: 'Precision collapses: the retrieved "chunk" is mostly irrelevant text, which wastes input tokens and buries the answer.' },
        { text: 'One chunk per sentence, for maximum precision', explanation: 'Individually meaningless chunks. A sentence usually lacks the context needed to answer, and you multiply index size for nothing.' },
      ],
      correct: 1,
    },
    {
      question: 'Which is the better answer to "what would you do differently on this project?"',
      options: [
        {
          text: '"I would write the golden question set before tuning anything — I tuned the chunker by feel for a week and could not prove any of it helped."',
          explanation:
            'Correct. Specific, names a real methodological mistake, and shows you learned the general lesson (measure before you tune) rather than a local fix.',
        },
        { text: '"I would use a more powerful model."', explanation: 'Not a decision you made or a lesson you learned — and on a RAG system the bottleneck is usually retrieval, so it also reads as a misdiagnosis.' },
        { text: '"Nothing — I am happy with how it turned out."', explanation: 'Reads as either no reflection or no depth. Every real system has a known weakness, and naming yours is the point of the question.' },
        { text: '"I would rewrite it in a faster language."', explanation: 'A performance answer to a project whose hard problem was retrieval quality. It signals you have not identified your own bottleneck.' },
      ],
      correct: 0,
    },
    {
      question: 'Per the worked estimation, the monthly LLM bill is ≈ $78,000 for 200,000 DAU. Which lever is the largest, and what does pulling it cost you?',
      options: [
        { text: 'Switch to a cheaper embedding model — embeddings are the bulk of the spend', explanation: 'Query embeddings are ~$36/month against $78,000. Optimising them is a rounding error dressed up as work.' },
        { text: 'Reduce output length — output tokens dominate', explanation: 'Output is $27,000 of $78,000, so it is real but secondary. Input is the bigger share, and cutting output length also degrades the answer directly.' },
        {
          text: 'Send fewer retrieved chunks — input is ~65% of the bill and passages dominate the input, but recall drops, so measure it on the golden set',
          explanation:
            'Correct. 5 chunks → 3 removes ~600 input tokens per query (~35% of input spend). The whole point of the harness is that you can price that recall loss instead of guessing.',
        },
        { text: 'Add a cross-user semantic cache — repeated questions are free after the first', explanation: 'Notes are private, so a cross-user cache hit is a data leak. Within one corpus the hit rate is honestly low. This is a rejected alternative, not a lever.' },
      ],
      correct: 2,
    },
    {
      question: 'Which of these belongs in the design doc but almost never appears in a whiteboard round?',
      options: [
        { text: 'A back-of-envelope QPS calculation', explanation: 'Standard in both. Whiteboard rounds open with exactly this.' },
        { text: 'An "alternatives considered" section naming what you rejected and why', explanation: 'Correct. The whiteboard rewards a working design; the doc rewards a decided one. Stating the road not taken is what makes it a design document rather than a description.' },
        { text: 'An architecture diagram with data flowing left to right', explanation: 'Present in both — it is the first thing drawn on a whiteboard.' },
        { text: 'The list of API endpoints', explanation: 'Both formats cover the API. The doc is just more precise about request and response shapes.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Walk me through a project on your resume.',
      answer:
        'Two minutes, then stop. "It is a question-answering service over my own study notes — you ask a question, it answers and shows you which note the answer came from." Then the hard part, named: "the difficulty is not calling a model, it is knowing whether retrieval actually found the right paragraph." Then the architecture in four or five boxes with data flowing one way — ingest walks the notes, chunks on headings at ~300 tokens with 50 overlap, embeds and indexes; a question goes through hybrid dense+BM25 retrieval, a cross-encoder rerank down to five chunks, and a grounded generation step that must answer only from the context and cite it. Then the measurement: 60 hand-labelled questions, recall@5 and MRR for retrieval, faithfulness for generation, scored separately, one result file per configuration. Then the honest limitation: single user, no access control — which is exactly what my design doc addresses. Then stop talking. What the interviewer is probing: can you compress a system into a narrative, do you know where its difficulty lives, and do you leave threads worth pulling. Rambling past two minutes buries the parts you wanted them to ask about.',
      isCaseBased: true,
    },
    {
      question: 'How did you know it worked?',
      answer:
        'By splitting the question into two measurable halves before I tuned anything. I wrote 60 questions from my own notes and stored the chunk id that genuinely answers each one — including a few my notes cannot answer, to test refusal — and froze that file before touching the retriever. Retrieval is scored with recall@k (was a gold chunk in the top k?) and MRR (how high did the first correct one rank?). Generation is scored with faithfulness: what fraction of the claims in the answer are supported by the retrieved text. Both are reported per configuration, with the delta, so I can say which change bought what. The split is the important part: high recall with low faithfulness means fix the prompt, low recall with high faithfulness means fix the chunker and the retriever — same end-to-end score, opposite fixes. And recall is a hard ceiling; at recall@5 = 0.70 no generator gets past 70%. The honest caveat I always attach: measured on my corpus, with a set I labelled myself, so it proves the system works on this data and nothing more. What is being probed: whether "it works" is a feeling or a measurement, and whether you know the limits of your own evidence.',
      isCaseBased: true,
    },
    {
      question: 'Case: your RAG demo looks great, but users report wrong answers roughly half the time. Where do you look first?',
      answer:
        'I do not touch the prompt or the model until I know which half is broken. First I run the golden set — if there isn\'t one for the failing traffic, I build one from real user questions, twenty is enough to point a direction. Then I read the two numbers. Low recall@5 → retrieval is failing, and I check in this order: parsing (is the source text even in the index intact?), chunk boundaries (is the answer split across two chunks so neither is retrievable?), and lexical misses (exact terms and acronyms that embeddings blur — the fix is hybrid retrieval). High recall with low faithfulness → the right context arrives and the model leaves it, so I add or strengthen the context-only instruction and display citations. If both look healthy on my set but users still complain, my set is unrepresentative — real questions are more ambiguous, more multi-turn, and often need query rewriting to be standalone. The general move: never debug a two-stage system with a one-stage metric.',
      isCaseBased: true,
    },
    {
      question: 'Case: you have two weeks left before applications. Would you add a reranker to your RAG project, or write the eval harness?',
      answer:
        'The harness, without hesitation, and I would say why in those terms. The reranker is one afternoon of code whose value is unknown; the harness is one afternoon of labelling that makes every future afternoon measurable — including that reranker. Concretely: with the harness I can say "the cross-encoder raised recall@5 by X and added Y ms at p95, so I kept it" or "it moved recall by 0.01 and cost 180 ms, so I removed it." Both sentences are strong in an interview; "I added a reranker because reranking is good practice" is not. There is also a portfolio argument: roughly every RAG project has a reranker and almost none has an eval table, so the harness is the differentiating artifact. And if I only had time for one after that, I would spend it on the README, because that is what a reviewer reads before deciding whether to run anything.',
      isCaseBased: true,
    },
    {
      question: 'Case: design the study-buddy for 1M users. Start with the estimation.',
      answer:
        'Assumptions first, stated so they can be argued with: 1M registered, 20% DAU = 200,000, 10 questions per active user per day, ~1,000 chunks per user, ~300 tokens per chunk, 768-dim embeddings. Traffic: 200,000 × 10 = 2M questions/day ÷ 86,400 ≈ 23 QPS average, ×4 for evening peak ≈ 93 QPS — small, so this is not a traffic problem and the query service is a few stateless containers. Storage: 10⁹ chunks × 3,072 B = 3.07 TB of vectors, plus 1.2 TB of chunk text and ~0.2 TB of metadata ≈ 4.5 TB — cheap on object storage, expensive in RAM. Memory: I do not need all of it resident, only the active working set — 200,000 DAU × 1,000 × 3,072 B ≈ 614 GB, about five 128 GB machines, or ~154 GB with int8 quantization at a recall cost I would measure. Cost: 5 chunks × 300 + 200 ≈ 1,700 input tokens and ~300 output per query; 60M queries/month gives 1.02 × 10¹¹ input and 1.8 × 10¹⁰ output tokens, which at $0.50/M and $1.50/M is $51,000 + $27,000 ≈ $78,000/month, or $0.39 per DAU. Then the part that matters: what those numbers decided. 93 QPS rules out heavy distributed machinery; per-tenant queries plus 768,000 multiply-adds per search rule out a global ANN index; $0.39 against a $1 goal leaves headroom that licenses the reranker.',
      isCaseBased: true,
    },
    {
      question: 'Why is a design doc a worthwhile portfolio artifact when it contains no code?',
      answer:
        'Because the document is the medium in which real architecture decisions get made, and almost no candidate has one to show. Senior work is largely writing the thing that gets a system agreed on — a design doc, an RFC, a one-pager — and a hiring manager reading yours learns three things a repo cannot show: whether you can defend a number in writing where it can be checked, whether you know what you deliberately did not build, and whether you can be precise without a whiteboard to hand-wave over. It is also the cheapest capstone: no infrastructure, no bill, a weekend of work, and it converts a small project into a large conversation — "I built it for one user, here is what breaks at a million, and here is which of those I would fix first."',
      isCaseBased: false,
    },
    {
      question: 'What sections does a good design doc have, and which one do candidates skip?',
      answer:
        'Context and goals; non-goals; requirements split into functional and non-functional; estimation; API; data model; architecture with a diagram; two or three deep dives; failure modes; rollout; cost; open questions and alternatives considered. Roughly 6–10 pages, with the deep dives taking the most space because that is what gets read closely. The two most-skipped are non-goals and alternatives-considered, and they are the two that most change a reader\'s opinion of you. Non-goals prove you scoped rather than drifted. Alternatives-considered proves you *chose* an architecture rather than described the first one you thought of — "considered a global ANN index; rejected because queries are per-tenant and a per-user scan is already sub-millisecond" is one sentence that does more work than a page of diagrams.',
      isCaseBased: false,
    },
    {
      question: 'How does writing a design doc differ from doing a 45-minute system design round?',
      answer:
        'Same content, stricter contract. First, you get to be precise, so you must be: "we will shard by user" passes in conversation, but on paper it needs the shard key, the rebalancing story, and the cost of a cross-shard query. Vagueness that survives a conversation is visible in text. Second, every number must be defended in place, because the reader can stop and check your arithmetic — so the assumption goes next to the number ("20% DAU, assumed"). Third, you must state what you did not choose; the whiteboard rewards a working design, the doc rewards a decided one. And a fourth that catches people out: the doc has to survive being read by someone who is not in the room. If a section only makes sense with you narrating it, the section is wrong.',
      isCaseBased: false,
    },
    {
      question: 'Tell me about the hardest bug you fixed.',
      answer:
        'Six beats: symptom, what I believed, how I checked, what was actually true, the fix, and what I changed so it cannot recur. The shape, from my RAG project: answers were correct but the citation underneath pointed at the wrong section. I assumed retrieval was broken — except recall@5 on my golden set was healthy, which contradicted that. So I printed the retrieved chunk text next to its stored heading for ten questions by hand; the text was right every time and the heading was one section ahead. The cause was that heading metadata was attached after splitting, so each chunk inherited the following section\'s heading. Fix: attach metadata at load time, before the split. Prevention: a test asserting a chunk\'s heading appears in its own source region, plus a line in the eval script that samples five citations for manual review. The beat that matters most is the fourth — my metric was structurally blind to that class of bug, because it matched on chunk text. Naming a limitation of your own measurement is the strongest thing you can say about a project. What is being probed: debugging method, not the bug — hypothesis, evidence, contradiction, root cause, prevention.',
      isCaseBased: false,
    },
    {
      question: 'What is the "grand MLOps capstone" and what does it let you claim that a Kaggle notebook does not?',
      answer:
        'One repository where Airflow ingests and trains on a schedule, DVC versions the data (pointer in git, bytes in object storage), MLflow tracks runs and holds the registry stages, Docker plus GitHub Actions build and ship to Kubernetes on a tag, Prometheus and Grafana watch the service layer, Evidently watches the model layer nightly against a frozen reference, and a drift alert triggers a retraining DAG that promotes the candidate only if it beats the incumbent on a frozen test set. What it lets me claim is operation, not fitting: reproducibility ("git SHA + DVC pointer + MLflow run + pinned image digest"), rollback ("redeploy the previous image tag; the artifact is immutable in the registry"), and drift detection ("prediction drift first, because it needs no labels"). A notebook proves I can model; this proves I can keep a model alive. The build order and repo layout are in the MLOps monitoring-and-capstone module.',
      isCaseBased: false,
    },
    {
      question: 'You listed a technology on your resume you only used briefly. What is the risk?',
      answer:
        'That it converts a neutral blank into a demonstrated gap. Interviewers choose which line to probe, and they probe depth: list Kafka and you get consumer groups and rebalancing; list "vector database" and you get asked what an HNSW parameter does to recall and latency. Failing that probe does more damage than the line ever bought, because it makes the rest of your claims suspect — if this one was decoration, which others were? My self-test per line is three questions: why this and not the obvious alternative, what broke while you built it, and what changes at 10× load. Three yeses, it stays; one no, I cut the line or spend a weekend earning it. Cutting is cheap. There is also a positive version of this: for the things you keep, the depth probe is the best part of the interview, because you are the only person in the room who has actually run it.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'The four capstones, and what each covers', back: '1 Mini-GPT (DL + GenAI + Backend) · 2 Full MLOps pipeline (ML + DevOps + MLOps) · 3 RAG study-buddy with eval harness, in Docker (GenAI + Backend + DevOps) · 4 Its HLD for 1M users (System Design).' },
    { front: 'RAG study-buddy build order', back: 'Dumb end-to-end skeleton → golden set (frozen, before tuning) → chunking → hybrid retrieval → reranker → grounded prompt + citations → Docker/README. Each step re-runs the harness and records a delta.' },
    { front: 'Why the golden set comes BEFORE the fancy retriever', back: 'Without a scoreboard every retrieval choice is a guess defended by a feeling. Written after seeing results, a question set is a rationalisation, not a measurement.' },
    { front: 'The two-halves rule for RAG evaluation', back: 'Retrieval: recall@k, MRR. Generation: faithfulness/groundedness, answer relevance. High recall + low faithfulness → fix the prompt. Low recall + high faithfulness → fix the chunker/retriever. Recall is a hard ceiling on end-to-end accuracy.' },
    { front: 'Chunking strategy to state and defend', back: 'Split on headings first, pack to ~300 tokens with ~50 overlap, never split a fenced code block, and attach source path + heading AT LOAD TIME, before the split.' },
    { front: 'Four failure modes that make a RAG project look amateur', back: 'No eval · chunk size never tuned · no citation display · secrets committed to the repo. (Plus: a README with no numbers and no limitations.)' },
    { front: 'Design-doc section list', back: 'Context & goals · non-goals · requirements (functional + non-functional) · estimation · API · data model · architecture · 2–3 deep dives · failure modes · rollout · cost · open questions & alternatives considered. 6–10 pages.' },
    { front: 'Three ways a doc differs from a whiteboard round', back: 'You get to be precise, so you must be · every number must be defended in place, with its assumption written next to it · you must state what you did NOT choose and why.' },
    { front: 'Study-buddy at 1M users — the headline numbers', back: '200k DAU × 10 q/day = 2M/day ≈ 23 QPS avg, ~93 peak · 10⁹ chunks × 3,072 B = 3.07 TB vectors · hot set 614 GB ≈ 5 boxes · 1,700 in / 300 out tokens per query → ≈ $78k/month ≈ $0.39 per DAU.' },
    { front: 'Resume line formula + the depth rule', back: 'What it does · the number that proves it · the stack. Fill numbers only from your own eval run. Interviewers probe depth on whatever you list, so listing what you cannot defend is worse than listing nothing.' },
  ],
  mindmapMarkdown: `- The Four Capstones: Your Portfolio Is Your Interview Story
  - Four, not forty — a project is a supply of answers you can defend
  - 1 Mini-GPT (brief)
    - Transformer from scratch + streaming FastAPI
    - Built in "CAPSTONE: Code a GPT from Scratch"
  - 2 Full MLOps pipeline (brief)
    - Airflow + DVC + MLflow + CI/CD + K8s + monitoring
    - Built in "Monitoring, Drift Alerts & the Grand MLOps Capstone"
  - 3 RAG study-buddy (built here)
    - Scope: one user, your own notes, citations, Docker
    - Ingest: load -> chunk (headings 300/50) -> embed -> index
    - Query: hybrid retrieve -> rerank -> grounded generate
    - Eval harness
      - 60 frozen questions + gold chunk ids
      - Retrieval recall@k / MRR vs generation faithfulness
      - One result file per config, report the delta
    - Build order: dumb skeleton -> golden set -> upgrades
    - Package: docker compose up, Makefile, README
    - Amateur tells: no eval, untuned chunks, no citations, secrets in repo
  - 4 Scalable API design doc — a writing deliverable, 6-10 pages
    - Sections: goals, non-goals, requirements, estimation, API, data model, architecture, deep dives, failures, rollout, cost, alternatives
    - Doc vs whiteboard: precise, numbers defended, state what you rejected
    - Estimation: 23 QPS avg / 93 peak, 3.07 TB vectors, 614 GB hot, $0.39 per DAU
    - Numbers decided: no global ANN index, per-tenant shards
  - The interview story
    - Resume line: what + number + stack
    - 2-minute walkthrough, then stop
    - Hardest bug: symptom -> belief -> check -> truth -> fix -> prevention
    - Depth probes: cut any line you cannot defend
    - Feeds "Behavioral Interviews: Eight STAR Stories From Your Own Work"`,
}

export default m
