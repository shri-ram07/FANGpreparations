import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l2-case-ml-systems',
  subjectId: 'sysdesign',
  level: 2,
  title: 'Case Study: Recommendations & LLM Serving at Scale',
  whyItMatters:
    'This is the module that makes an AIML background an advantage instead of a footnote. Most candidates can design a URL shortener; far fewer can say why a heavy ranker on 100M items needs 70,000 GPUs and a funnel needs 0.2, or why LLM concurrency is capped by KV-cache bytes rather than FLOPs. Two designs here — a recommendation feed and a ChatGPT-style serving stack — both walked through the same seven-step method, both ending in the tradeoff defense the round is actually scored on.',
  estMinutes: 70,
  sections: [
    {
      type: 'intuition',
      title: 'Two designs, one method',
      md: `An ML system in an interview is still a system. The model is one box in the diagram, and it is rarely the box that breaks.

- **Part A: a recommendation feed** — YouTube home, an e-commerce "for you" row. The design problem is *how do you avoid scoring the catalog?*
- **Part B: ChatGPT-style LLM serving** — the design problem is *how do you fit expensive stateful generation onto scarce GPUs?*
- Both follow the plan's method in order: **requirements → estimation → API → data model → HLD → deep-dive two components → bottlenecks & tradeoffs.**
- Every step is posed as a question first. Stop and answer it before reading on — that is exactly how the 45 minutes goes.
- One rule for both parts: **the model is not the system.** Retrieval, features, logging, caching, and capacity are the design. A candidate who spends 30 minutes on model architecture has failed a system design round.`,
    },
    {
      type: 'intuition',
      title: 'A · Step 1 — Requirements. What is a "good feed"?',
      md: `*Try it first: write the functional requirements for a personalized home feed in one line each, then the non-functional ones. The non-functional list is where the architecture is decided.*

**Functional**

- **Personalized ranked list**: given a user, return ~10–20 items ordered by predicted engagement, paginated as they scroll.
- **Fresh items must surface**: an item uploaded an hour ago has no engagement history, and if the system only ranks by history it can never get any. Freshness is a requirement, not a nice-to-have.
- **Feedback ingestion**: impressions, clicks, watch time, skips, and explicit signals flow back for the next training round.
- **Cold start, both sides**: a brand-new user (no history) and a brand-new item (no engagement) must both be handled.

**Non-functional**

- **Latency**: the whole page in ~100–200 ms p99. The recommendation service gets a budget of ~100 ms of that; the rest is network, page assembly, and everything else on the screen.
- **Freshness of the model's view**: the user's actions from *this* session should influence the *next* request. Minutes, not days.
- **Availability over perfection**: if the ranker is down, serve trending. A degraded feed beats an error page — nobody can prove their feed was optimal.
- **Diversity**: ten near-identical items is a failure even if all ten have the highest predicted click-through. The metric the model optimizes is not the metric the product needs.`,
    },
    {
      type: 'note',
      md: `**Availability over perfection is a design permission, and you should take it out loud.** Because "correct" is undefined for a feed, every layer gets a fallback: ranker times out → serve the candidate list in retrieval order; candidate generation times out → serve a cached list from 10 minutes ago; everything is down → serve regional trending. Compare with a payments system, where a wrong answer is worse than no answer. Recognizing which kind of system you are designing decides whether you reach for timeouts-with-fallback or for transactions.`,
    },
    {
      type: 'intuition',
      title: 'A · Step 2 — Estimation. The number that forbids the obvious design',
      md: `*Try it first: 100M items in the catalog, 200M DAU, 20 feed requests per user per day. Compute QPS. Then compute what it would cost to score every item for every request — that number is the whole architecture.*

- **Requests**: 200M × 20 = **4B feed requests/day** → 4B / 86,400 ≈ **46,000 QPS** average. Apply a 3× peak factor → **~140,000 QPS** peak.
- **The naive design**: for each request, score all 100M items with the ranking model and take the top 20. It is obviously correct and obviously the answer nobody ships.
- **Cost of that**: a real ranking DNN costs roughly **2 MFLOP per (user, item) pair**. 100M items × 2 MFLOP = **200 TFLOP per request**. Times 140,000 requests/sec = **28 EFLOP/s** — about **70,000 accelerators running flat out**, for one row of one page.
- **The funnel version**: let the heavy ranker see only ~300 items. 300 × 2 MFLOP = 0.6 GFLOP/request → **0.2 GPUs at peak.** Same model, **333,000× less work.**
- **The insight this forces**: you cannot make the model cheap enough. You must make the *candidate set* small enough. That is the multi-stage funnel, and it is the answer to this entire case study.
- **Storage sanity check**: item embeddings at 128 dimensions — 100M × 128 × 4 B = **51 GB** in fp32, **12.8 GB** at int8. That fits in RAM on one large box, which is why an approximate-nearest-neighbour index is even possible.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'The arithmetic that forces the funnel',
      code: `CATALOG  = 100_000_000   # items in the catalog
PEAK_QPS = 140_000       # feed requests/sec at peak
RANKER   = 2_000_000     # ~2 MFLOP per (user, item) pair - one real DNN ranker
GPU      = 4e14          # ~400 TFLOP/s effective from one accelerator

def gpus(items):
    return items * RANKER * PEAK_QPS / GPU

print("score all 100M ->", f"{gpus(CATALOG):11,.0f} GPUs")
print("score top 300  ->", f"{gpus(300):11,.1f} GPUs")
print("same model, less work:", f"{CATALOG // 300:,}x")

for b, name in ((4, 'fp32'), (2, 'fp16'), (1, 'int8')):
    print("item vectors @128-d", name, f"{CATALOG * 128 * b / 1e9:5.1f} GB")

# score all 100M ->      70,000 GPUs
# score top 300  ->         0.2 GPUs
# same model, less work: 333,333x
# item vectors @128-d fp32  51.2 GB
# item vectors @128-d fp16  25.6 GB
# item vectors @128-d int8  12.8 GB`,
      annotations: {
        3: 'A deliberately modest ranker. Real production rankers are heavier — which only makes the gap worse, not better.',
        4: 'Effective throughput, not the spec-sheet peak. Interviewers respect a candidate who discounts marketing numbers.',
        9: '70,000 accelerators, continuously, for one feed row. This is the number that kills the naive design in one sentence.',
        11: 'The ratio is the design. You did not shrink the model — you shrank what the model looks at.',
        14: 'Why the ANN index is feasible at all: the whole item table fits in the RAM of a single large machine, and int8 quantization gives you 4x more headroom.',
      },
    },
    {
      type: 'intuition',
      title: 'A · Step 3 — API. Two endpoints, and one field that decides whether you can train at all',
      md: `*Try it first: write the endpoints. One response field, if you omit it, silently destroys your training data six months from now.*

- \`GET /feed?cursor=<opaque>&limit=20\` → returns items **plus** \`request_id\`, and per item its \`position\`, \`candidate_source\`, and the \`model_version\` that ranked it.
- \`POST /events\` → batched client-side impressions, clicks, dwell/watch time, skips, "not interested". Fire-and-forget into a queue, never blocking the UI.
- **Cursor pagination, not offset** — the same reason as any feed: the list mutates as you scroll, so \`OFFSET 40\` re-shows items, and deep offsets get linearly slower.

**The field that matters is \`request_id\`, echoed on every event.** Without it you know a user clicked item 77, but not *what else you showed them*, *where on the page it sat*, or *which model version produced that ordering*.

- No negatives: a click is a positive, but the nineteen items shown and ignored are your negatives. Lose the impression join and you are training on positives only.
- No position correction: position 1 gets clicked far more than position 10 regardless of quality. Without logged positions you cannot model that bias, and your model just learns to predict position.
- No attribution: after a launch you cannot say which model version produced which behaviour.

Say it plainly in the interview: **the logging schema is part of the API design, not an afterthought.** This is the single most common gap in ML system design answers.`,
    },
    {
      type: 'intuition',
      title: 'A · Step 4 — Data model. Five stores, each serving one query',
      md: `*Try it first: list the stores. For each one, name the exact query it exists to answer — that is what picks the technology.*

- **Item catalog** (relational or document): "give me metadata for these 300 item ids." Point lookups by id, hydrated *after* ranking, never during.
- **Item embedding index** (ANN — HNSW or IVF): "give me the 1,000 items closest to this user vector." 12–51 GB, rebuilt in batch, refreshed incrementally for new items. The GenAI module *Embeddings, Vector Databases & Semantic Search* covers how the index works internally; here it is a component with a known latency and a known recall knob.
- **Feature store, online half** (Redis / DynamoDB-style KV): "give me the current feature vector for user u and for these 300 items." Single-digit-millisecond point reads, because it sits inside the request budget.
- **Seen-set** (per-user Bloom filter or capped set): "has this user already been shown item i?" A Bloom filter is the right shape here — a few hundred KB per user instead of a full id list, and its false positives merely hide an item the user would probably have skipped anyway.
- **Interaction log** (Kafka → data lake / warehouse): append-only impressions and engagements. This is the *training set*, and it is the only store here whose value is measured in months rather than milliseconds.

Notice what is **not** a store: the final ranked list. Coming up next is why caching it is a mistake.`,
    },
    {
      type: 'intuition',
      title: 'A · Step 5 — HLD: the multi-stage funnel, with a budget per stage',
      md: `*Try it first: draw the path from 100M items down to the 10 you render, and put an item count and a millisecond budget on every arrow. If your stages do not narrow by roughly 100× each, you have the wrong shape.*

1. **Candidate generation — 100M → ~1,000, budget ~25 ms.** Several cheap retrievers run *in parallel* and their outputs are unioned: ANN over the two-tower embedding (~500), collaborative-filtering neighbours "users like you also watched" (~200), items from accounts the user follows (~200), and trending/fresh in their region (~100). Multiple sources exist so that no single model's blind spot becomes the system's blind spot.
2. **Filtering — 1,000 → ~300, budget ~5 ms.** Drop already-seen (the Bloom filter), blocked creators, region and policy violations, sold-out or deleted items, and anything age-inappropriate. Cheap boolean logic, and note it is a *hard* filter — never something the ranker is asked to learn.
3. **Ranking — ~300 items scored, budget ~45 ms.** One heavy model, one batched forward pass over all 300 (user features are shared, item features vary), producing a predicted engagement score per item. This is where the model quality lives, and it is affordable only because step 1 and step 2 did their job.
4. **Re-ranking and business rules — 300 → 10, budget ~10 ms.** Diversity (at most 2 items per creator or category), freshness injection (reserve a slot for a new item), ad slots, promotions, and any manual boosts. Deterministic policy, not a model.

Total ≈ **85 ms**, leaving headroom inside the 100 ms service budget for the tail. Each stage is **cheaper per item and dumber** than the one after it — that asymmetry is the whole trick: precision gets more expensive as the candidate set gets smaller.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One feed request down the funnel: 100M to 10',
        notice: 'Left column is the work happening now; right column is what survives. Watch the count collapse and the per-item cost rise.',
        leftLabel: 'stage',
        rightLabel: 'candidates',
        frames: [
          {
            note: 'GET /feed lands. The catalog is 100,000,000 items. Nothing is ranked yet, and the entire budget — about 100 ms — is still unspent. Scoring all of these with the ranking model would take ~70,000 GPUs at peak, so no stage in this diagram ever touches the whole catalog.',
            stack: [{ name: 'GET /feed asha', value: 'budget 100 ms' }],
            heap: [{ id: 'cat', value: '100,000,000 items', label: 'catalog — never scanned' }],
          },
          {
            note: 'Stage 1, candidate generation, ~25 ms. Four cheap retrievers run in parallel and their results are unioned. The ANN probe never looks at 100M vectors — it walks a graph index and touches a few thousand. Multiple sources on purpose: one model\'s blind spot must not become the system\'s.',
            stack: [
              { name: 'ANN two-tower', to: 'gen' },
              { name: 'CF neighbours', to: 'gen' },
              { name: 'follows', to: 'gen' },
              { name: 'trending / fresh', to: 'gen' },
            ],
            heap: [
              { id: 'cat', value: '100,000,000 items', label: 'catalog — untouched' },
              { id: 'gen', value: '~1,000 candidates', label: 'union of 4 sources' },
            ],
          },
          {
            note: 'Stage 2, filtering, ~5 ms. Already-seen (Bloom filter), blocked creators, region and policy blocks, deleted or sold-out items. Pure boolean logic — hard rules, never something the ranker is asked to learn. About 700 candidates die here.',
            stack: [
              { name: 'seen-set (bloom)', to: 'filt' },
              { name: 'policy / region', to: 'filt' },
              { name: 'blocked / deleted', to: 'filt' },
            ],
            heap: [
              { id: 'gen', value: '~1,000 candidates', label: 'incoming' },
              { id: 'filt', value: '~300 candidates', label: 'eligible' },
            ],
          },
          {
            note: 'Stage 3, ranking, ~45 ms. One batched forward pass of the heavy DNN over ~300 items: user features fetched once from the online feature store, item features fetched for the 300. 0.6 GFLOP total. This is the only stage where model quality lives — and it is affordable purely because stages 1 and 2 shrank the input 333,000x.',
            stack: [{ name: 'heavy ranker (1 batch)', to: 'rank' }],
            heap: [
              { id: 'filt', value: '~300 candidates', label: 'input batch' },
              { id: 'rank', value: '300 scored, sorted', label: 'p(engage) per item' },
            ],
          },
          {
            note: 'Stage 4, re-ranking, ~10 ms. Deterministic business rules on top of the scores: max 2 items per creator (diversity), one reserved slot for a fresh item, ad slots, manual boosts. The top-10 by raw score is NOT what ships — it collapses into ten near-identical items.',
            stack: [
              { name: 'diversity cap', to: 'page' },
              { name: 'freshness slot', to: 'page' },
              { name: 'ads / boosts', to: 'page' },
            ],
            heap: [
              { id: 'rank', value: '300 scored, sorted', label: 'raw model order' },
              { id: 'page', value: '10 items rendered', label: '~85 ms total' },
            ],
          },
          {
            note: 'The loop closes. All 10 impressions — with request_id, position, candidate_source and model_version — go to Kafka, whether clicked or not. The 9 ignored items are your negatives; without them you train on positives only. This arrow is what makes tomorrow\'s model better than today\'s.',
            stack: [{ name: 'POST /events (batched)', to: 'log' }],
            heap: [
              { id: 'page', value: '10 items rendered', label: 'shown to user' },
              { id: 'log', value: '10 impressions + 1 click', label: 'Kafka -> warehouse -> training' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'A · Deep dive 1 — two-tower retrieval, and why the factorization is the point',
      md: `*Try it first: you need "the 1,000 items most relevant to this user" out of 100M, in 25 ms. What model shape makes that possible?*

- A **cross-encoder** — one network eating (user, item) together — is the accurate shape, and it is exactly what stage 3 uses. It is also useless for retrieval: relevance cannot be computed until the request arrives, so you are back to 100M forward passes.
- The **two-tower** model splits it: a **user tower** maps user features → a 128-d vector, an **item tower** maps item features → a 128-d vector, and relevance is just their **dot product**. Trained together on engagement data, usually with in-batch negatives.
- **Why this changes everything: the item tower does not depend on the user.** So all 100M item vectors are computed *offline*, in batch, and loaded into an ANN index. At request time you run exactly **one** forward pass — the user tower — and then probe the index.
- The cost per request collapses from 100M model evaluations to *one* model evaluation plus one sublinear index probe. HNSW/IVF mechanics are the GenAI module *Embeddings, Vector Databases & Semantic Search*; here it is a black box with two knobs: **recall** and **latency**, traded against each other.
- **The price you pay** is the reason stage 3 exists: because the towers never see each other until the dot product, the model cannot express interactions between user and item features ("this user likes long videos *only on weekends*"). Two-tower retrieval is deliberately dumber, and the ranker fixes it on 300 items instead of 100M.
- **Cold start falls out of this.** A new item has no engagement, but the item tower runs on *content* features (title, category, creator, thumbnail embedding) — so it gets a vector the moment it is uploaded and becomes retrievable immediately. A new user has no history, so their tower falls back to context features (region, device, referrer, time of day) plus a trending source. Neither cold start needs a special subsystem; it needs the towers to consume content and context features, not just id embeddings.`,
    },
    {
      type: 'note',
      md: `**A pure-id model cannot cold start, ever.** If the item tower is just an embedding table keyed by \`item_id\`, a new item's row is random noise until enough engagement exists to train it — and it gets no engagement because it is never retrieved. That deadlock is the strongest architectural argument for content features, and it is worth naming explicitly: *"I would keep the item tower on content features so an item is retrievable at upload time, and let the id embedding refine it later."* Same for collaborative filtering, which is defined entirely over the interaction matrix — see the ML module *Recommendation Systems & Time-Series Basics* for why CF alone cannot answer this.`,
    },
    {
      type: 'intuition',
      title: 'A · Deep dive 2 — the feature store, and the bug it exists to prevent',
      md: `*Try it first: your model trains on features computed by a Spark job over the warehouse, and serves on features computed by a Python function in the API. Offline AUC is excellent. Online the model is barely better than random. What happened?*

- **Training/serving skew**: the two code paths compute *slightly different* features from the same name. Training's \`user_7d_watch_count\` counts a rolling 7 days with sessions deduplicated; serving's counts calendar days without dedup. The model was trained on a feature that does not exist at serving time.
- The skew is silent. Nothing errors, nothing alerts, both numbers look plausible. You find it by comparing distributions of the *same feature* between the training set and production logs — that comparison should be a standing job, not a debugging session.
- **A feature store** is the fix: one definition of each feature, materialized into two halves. The **offline** half (warehouse, columnar, full history) builds training sets; the **online** half (KV store, millisecond point reads) serves the request path. Same definition, two access patterns.
- **Point-in-time correctness** is the second, subtler failure: when you build a training row for a click at 10:00, every feature must have the value it had **at 09:59:59**, not today's value. Join with today's \`item_total_likes\` and you have leaked the future into the label — offline metrics soar, production does nothing. This is exactly the leakage pattern from the ML module *Feature Engineering & Data Leakage*; the MLOps module *Serving Patterns, Feature Stores & Testing ML Code* covers how a store implements the as-of join.
- **The design consequence for this case study**: the online store sits inside the 100 ms budget. Its p99 is your p99. Which is why the funnel fetches user features **once** per request and item features **only for the ~300 survivors** — fetching item features during candidate generation would mean 1,000+ reads instead of 300, for items you are about to throw away.`,
    },
    {
      type: 'intuition',
      title: 'A · Caching: cache the candidates, not the ranking',
      md: `*Try it first: the feed service is at 140k QPS and you want a cache. What exactly do you cache, and with what TTL?*

- **Do not cache the final ranked page.** It is personalized (hit rate near zero across users), it goes stale the instant the user interacts, and worst of all it *freezes the experiment*: a cached page was ranked by whichever model version happened to be live at write time, so your A/B assignment silently leaks.
- **Do cache the candidate list** — the output of stage 1, keyed by user, TTL ~10 minutes. Candidate generation is the expensive-and-slow-changing stage; ranking is cheap on 300 items and *must* stay live so it can react to what the user did five seconds ago.
- **Precompute for the tail, compute on demand for the head.** For users who open the app once a week, a nightly batch job writes a ready candidate list — no ANN probe at request time at all. For heavy users, compute live: their state changes too fast for a precomputed list to be right.
- **Cache the shared things aggressively**: item metadata, item embeddings, trending lists, and creator info are *not* personalized — one cache entry serves millions of users. That is where a cache actually earns its hit rate.
- **The invalidation rule**: seen-items must be applied *after* the cache, never baked into it. Otherwise a user scrolling a cached list sees the same items again — the single most-reported bug in feed systems.
- Layering, TTLs, and stampede protection are the System Design module *Caching: Every Layer, Every Strategy*; what is specific here is **which** artifact deserves a cache.`,
    },
    {
      type: 'intuition',
      title: 'A · The feedback loop, and how it poisons itself',
      md: `*Try it first: the system trains on what users click. It only shows what it predicts they will click. Play that forward six months.*

- **The loop**: impressions and engagements → Kafka → warehouse → nightly (or hourly) training → new model → shadow evaluation → A/B → ramp. Fast loops win; a model trained on last week's behaviour is already wrong about today's.
- **Position bias**: position 1 collects far more clicks than position 10 for identical items. Train naively and the model learns "items I put at the top get clicked" — a self-fulfilling prophecy. Mitigations: log the position as a feature and drop it at serving (or hold it at a constant), or reweight training examples by inverse propensity.
- **Popularity bias / the rich get richer**: popular items get shown, so they get engagement, so they look more popular. New and niche items starve. This is the same deadlock as item cold start, arriving through the training data instead of the index.
- **The filter bubble**: the user's own feedback narrows their candidate pool, which narrows their feedback further. Engagement can look fine for months while the catalog the user is *able* to discover shrinks to nothing — and then they churn, and no online metric predicted it.
- **The mitigation is exploration**: deliberately show items the model is *unsure* about. **Epsilon-greedy** — reserve a fraction of slots (say 5%) for random or under-explored items. **Bandits** — pick by upper-confidence bound or Thompson sampling, so uncertainty itself earns impressions. Either way you knowingly pay a small short-term engagement cost to buy training signal on the unexplored catalog.
- **The tradeoff to state out loud**: exploration is a *cost you must defend*. "5% of slots explore" is a real drop in today's click-through; the return is a catalog that stays discoverable and a model that keeps learning. If your interviewer pushes back on the cost, the defense is the cold-start deadlock — without exploration, nothing new is ever retrievable.`,
    },
    {
      type: 'note',
      md: `**Offline wins that lose online.** Offline you replay logged data and compute ranking metrics — NDCG, MAP, precision@K (the Metrics module *Ranking Metrics: Precision@K, MAP & NDCG*). Online you run an A/B test on real traffic. They disagree constantly, for structural reasons: (1) offline you only ever see labels for items the *old* model chose to show — no impression, no label, so the new model's best ideas are unscorable; (2) offline optimizes predicted clicks, while the business metric is session length, retention, or revenue; (3) offline has no feedback loop — online, your model changes what users see, which changes what they do. The interview-safe sentence: **"offline metrics are a filter for what deserves an A/B test, never a substitute for one."** Which business metric you A/B on is the Metrics module *Pick the Metric: Case Studies That Decide the Interview*.`,
    },
    {
      type: 'intuition',
      title: 'A · Bottlenecks & tradeoffs',
      md: `*Try it first: the funnel is live at 140k QPS. Name the three places it degrades first — one in retrieval, one in the feature path, one you cannot see on the serving diagram at all — and for each, say which dial you would turn and what that costs. A good answer ends with three tradeoffs stated as dials, not decisions.*

- **The ANN index is a recall/latency dial, and it is the system\'s quality ceiling.** An item missed in stage 1 can never be recovered by a better ranker — the funnel is one-way. Tightening the probe saves 5 ms and silently drops relevant items. Watch recall against a brute-force sample, not just latency.
- **The online feature store is the p99.** It is on the critical path for every request; its tail latency *is* your tail latency. Mitigate with local caching of user features per request, tight timeouts, and serving a default feature vector rather than failing.
- **The ranker is the cost centre.** Candidate count and model size multiply directly into GPU spend. Cutting stage 3 from 500 items to 300 is a 40% cost cut for a usually-tiny quality loss — measure it, do not assume it.
- **Fanout latency**: four parallel retrievers means your stage-1 latency is the *slowest* one. Hedge with per-source timeouts and proceed with whatever returned; a feed missing the "trending" source is fine.
- **The training pipeline is a bottleneck you cannot see from the serving diagram.** If retraining takes 18 hours, your model is a day stale and no serving optimization fixes that.
- **The three tradeoffs to name explicitly**: (1) *funnel depth vs quality* — more stages means more cost control and more one-way recall loss; (2) *personalization vs cacheability* — every bit of personalization destroys cache hit rate; (3) *exploitation vs exploration* — today's engagement against tomorrow's model. Every one of these is a dial, not a decision, and saying so is what a senior answer sounds like.`,
    },
    {
      type: 'intuition',
      title: 'B · Step 1 — Requirements for ChatGPT-style serving',
      md: `*Try it first: what makes serving an LLM different from serving any other model behind an API? Three things, and each one bends the architecture.*

**Functional**

- **Streaming tokens**: the response arrives progressively. A 500-token answer takes ~10 seconds to finish, so the connection must stay open and push. Time to *first* token is the number users feel.
- **Multi-turn context**: each request carries the whole conversation. The service is stateless about conversations — the client (or a conversation store) sends the history, and the GPU holds nothing between requests.
- **Many models and tiers**: a big model for paid users, a small fast one for free users, plus older pinned versions for API customers who cannot tolerate behaviour changes.
- **Cancellation**: a user closing the tab must free the GPU slot immediately. This is a *capacity* feature, not a UX nicety.

**Non-functional**

- **Time to first token (TTFT)**: target under ~1 s. **Inter-token latency**: under ~50 ms, so the text reads faster than a person.
- **Cost per token is a first-class constraint** — unlike almost every other system you will design. A single conversation can cost more than a thousand feed requests, so cost is not an optimization pass at the end; it shapes the routing, the batching, and the tier structure.
- **Throughput under fairness**: one customer streaming 100 concurrent 8k-token generations must not starve everyone else.
- Out of scope, said out loud: training, fine-tuning, and safety classification (a separate, cheap model in front and behind).`,
    },
    {
      type: 'intuition',
      title: 'B · Step 2 — Estimation. Weights, then KV cache, then the fleet',
      md: `*Try it first: a 70B-parameter model. How much GPU memory do the weights need at fp16? At int8 and int4? Then: how much more memory does each concurrent user need, and why is that the number that caps concurrency?*

**Weights** — parameters × bytes per parameter:

- **fp16 (2 bytes)**: 70 × 10⁹ × 2 = **140 GB**. An 80 GB accelerator cannot hold it; you need at least 2, realistically 4 with tensor parallelism to leave room for everything else.
- **int8 (1 byte)**: **70 GB** — fits on one 80 GB card, with ~10 GB left over.
- **int4 (0.5 bytes)**: **35 GB** — one card, **~45 GB free**. Hold on to that 45 GB.

**KV cache** — the per-token state that makes generation fast and memory hungry. For a 70B-class model with 80 layers, 8 grouped-query KV heads and head dimension 128:

- Per token per layer: K and V, so 2 × 8 × 128 = 2,048 values → at fp16, **4 KB**.
- Across 80 layers: 80 × 4 KB = **320 KB per token**.
- An 8,000-token conversation: 8,000 × 320 KB ≈ **2.6 GB — for one user.**
- So the 45 GB left after int4 weights holds about **17 concurrent 8k-token conversations**, or ~34 at 4k average. That, not FLOPs, is your concurrency limit per GPU.
- **Why grouped-query attention exists, in one line**: with full multi-head attention (64 KV heads instead of 8) the same model costs 2.6 MB per token — 21 GB for one 8k conversation, **two users per GPU.** The mechanism is the GenAI module *Inference: KV-Cache, Quantization & Serving*; the system consequence is that your capacity planning is dominated by an architectural choice inside the model.

**The fleet** — 20M DAU × 15 messages/day = 300M messages/day → ~3,500 msg/s average, **~10,000/s peak**. At ~500 output tokens each that is **5M output tokens/sec** at peak. A well-batched GPU produces on the order of 2,000–3,000 tokens/s, so you need **roughly 2,000 accelerators for decode alone** — before prefill, before redundancy, before regional capacity. At a few dollars per GPU-hour that is tens of millions of dollars a year, which is why the cost section below is not optional.`,
    },
    {
      type: 'math',
      intro: 'The two estimates written out. Round hard — the interviewer wants the magnitude and the reasoning, not the decimals.',
      latex: [
        '\\text{weights} = 70\\times10^{9} \\times b \\;\\;\\Rightarrow\\;\\; 140\\,\\text{GB (fp16)},\\;\\; 70\\,\\text{GB (int8)},\\;\\; 35\\,\\text{GB (int4)}',
        '\\text{KV per token} = 2 \\times L \\times h_{kv} \\times d_{head} \\times b = 2 \\times 80 \\times 8 \\times 128 \\times 2\\,\\text{B} = 320\\,\\text{KB}',
        '\\text{concurrency} \\approx \\frac{\\text{HBM} - \\text{weights}}{\\text{ctx} \\times \\text{KV/token}} = \\frac{80 - 35\\ \\text{GB}}{8000 \\times 320\\,\\text{KB}} \\approx 17\\ \\text{users/GPU}',
        '\\text{decode fleet} = \\frac{10{,}000\\ \\text{msg/s} \\times 500\\ \\text{tok}}{2{,}500\\ \\text{tok/s per GPU}} \\approx 2{,}000\\ \\text{GPUs}',
      ],
    },
    {
      type: 'intuition',
      title: 'B · Step 3 — API. Streaming is a protocol decision',
      md: `*Try it first: design the endpoint. How does the response stream, and what happens when the client disappears mid-generation?*

- \`POST /v1/chat/completions\` — body \`{ model, messages[], max_tokens, temperature, stream: true }\`. Auth by API key or session token; the key carries the **tier**, which decides routing and limits.
- **Streaming over SSE (Server-Sent Events)**, not WebSocket, as the default. Generation is one-directional after the request: server → client, token by token. SSE is plain HTTP, works through every proxy and CDN, reconnects natively, and costs one connection. WebSocket earns its complexity only when you need genuine bidirectional traffic mid-generation (live voice, interleaved tool results).
- **Cancellation is mandatory.** A closed connection must propagate to the worker and free the KV cache immediately. Without it, abandoned generations hold GPU memory for their full \`max_tokens\` — and abandonment rates on chat UIs are high enough to cost real capacity.
- **\`max_tokens\` is a required, capped field.** It is the only bound on how long a request occupies a slot, so it is a capacity control disguised as an API parameter.
- **Idempotency key** on the request: a retry after a network blip must not re-run a generation you already paid for. Cache the completed response against the key.
- **The stateless choice**: the client sends the full \`messages\` array every turn; the server keeps no conversation state on the GPU. This makes workers interchangeable — any request can go to any worker, and a worker can die without losing a conversation. The cost is that a 10-turn chat re-sends and re-prefills the whole history, which is exactly what prefix caching (below) exists to claw back.`,
    },
    {
      type: 'intuition',
      title: 'B · Step 4 — What state exists, and where it must not live',
      md: `*Try it first: list every piece of state in this system, then ask which of it is allowed to touch a GPU.*

- **Conversation history** (document store, sharded by user): the durable transcript. Read by the client to build the request; **never** held on a worker between requests.
- **Model registry** (metadata + weights in blob storage): model id → version, weight artifacts, quantization variant, which GPU pools serve it, and rollout percentage. Pinned versions for API customers live here.
- **Quota and usage counters** (Redis): tokens consumed per key per window, for rate limiting and for billing. Written on the hot path, so approximate-and-fast beats exact-and-slow.
- **Prompt / prefix cache** (GPU memory, plus a spillover tier): computed KV for common prefixes — the system prompt, a long shared document, the earlier turns of this same conversation.
- **Request log** (append-only, to a warehouse): prompt hash, token counts, model version, latency, tier. Billing, capacity planning, and abuse detection all read this.
- **The rule**: the only state a GPU may hold is the KV cache for *in-flight* requests, plus the prefix cache. Everything else lives off-GPU. GPU memory is the scarcest resource in the building — 80 GB of it costs more than terabytes of anything else — so nothing gets to sit there idle.`,
    },
    {
      type: 'intuition',
      title: 'B · Step 5 — HLD: gateway, router, queue, GPU pools, stream',
      md: `*Try it first: draw the path of one message from the browser to the first token on screen. Name the component that protects the GPUs from the internet.*

1. **API gateway**: TLS, auth, tier lookup, **per-tier rate limiting** (requests/min *and* tokens/min — token limits are the ones that matter, since one request can be 100× another), request validation, and \`max_tokens\` capping. It also does **admission control**: when the system is saturated, the gateway returns 429 with \`Retry-After\` rather than letting the queue grow without bound.
2. **Router**: picks the target pool from (model id, tier, region, rollout %). Free tier → small model pool; paid → large model pool; pinned versions → their own pool. Routing by model is why you run *pools*, not one homogeneous fleet.
3. **Queue** (per pool, priority-aware): absorbs burstiness and decouples arrival rate from GPU capacity. Every queue needs a **max depth** and a **max wait** — beyond that, shed. A request that waits 30 seconds has already failed the user; serving it just wastes a GPU. Backpressure mechanics are the System Design module *Message Queues: Decoupling, Backpressure & Kafka*.
4. **Inference workers on GPU pools**: each holds the model weights resident and runs a **continuous batching** loop, pulling from the queue as slots free. Per-worker capacity is measured in KV-cache bytes, not requests.
5. **Streaming back**: the worker emits tokens to the gateway, which relays SSE frames to the client. The connection is held open for the full generation, so the gateway must handle tens of thousands of long-lived connections — an async/event-loop server, not a thread-per-connection one.

The shape to notice: **a queue in the middle and a rate limiter at the edge** are the two components that keep an expensive, slow, memory-bound backend alive behind a fast, bursty frontend. That pattern is not LLM-specific; the LLM just makes the cost of getting it wrong enormous.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'One message through the LLM stack: queue, prefill, decode, stream',
        notice: 'Left column is the request being handled; right column is the GPU worker\'s memory. Watch KV cache — it is the resource that runs out, not compute.',
        leftLabel: 'request path',
        rightLabel: 'GPU worker (80 GB)',
        frames: [
          {
            note: 'Gateway. Auth resolves the API key to a tier, per-tier token-per-minute limits are checked, max_tokens is capped, and the router picks the int4-70B pool. The GPU has not been touched yet — everything that can reject a request cheaply happens here, on CPU.',
            stack: [{ name: 'POST /chat (tier: paid)', value: 'auth, rate limit, cap' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'resident, never moves' },
              { id: 'kv', value: 'KV cache: 26 / 45 GB', label: '30 requests in flight' },
            ],
          },
          {
            note: 'Queued. The pool is busy, so the request waits ~120 ms. This queue is the shock absorber between bursty arrivals and fixed GPU capacity — but it has a max depth and a max wait. Past those, the gateway sheds with 429 rather than admitting a request that will time out anyway.',
            stack: [{ name: 'queued', value: 'depth 14, wait ~120 ms' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'resident' },
              { id: 'kv', value: 'KV cache: 26 / 45 GB', label: '30 in flight' },
            ],
          },
          {
            note: 'PREFILL. The 2,000-token prompt is processed in ONE compute-bound pass — all tokens in parallel, ~2 x 70B x 2,000 = 280 TFLOP. This is what time-to-first-token is made of. It also allocates KV for the whole prompt: 2,000 x 320 KB = 0.64 GB, claimed before a single output token exists.',
            stack: [{ name: 'prefill 2,000 tok', to: 'kv', value: 'compute-bound' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'read once for the batch' },
              { id: 'kv', value: 'KV cache: 26.6 / 45 GB', label: '+0.64 GB for this prompt' },
            ],
          },
          {
            note: 'DECODE, step 1 of ~500. Completely different workload: one token per request, memory-bandwidth-bound. Reading 35 GB of weights at ~3 TB/s costs ~12 ms — and that SAME read serves every request in the batch. Batch of 31 is ~31x the throughput for nearly the same latency. This is why batching is the entire economics of LLM serving.',
            stack: [{ name: 'decode step (batch 31)', to: 'kv', value: 'bandwidth-bound' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: '1 read serves all 31' },
              { id: 'kv', value: 'KV cache: 26.6 -> 26.61 GB', label: 'grows 320 KB x 31 per step' },
            ],
          },
          {
            note: 'CONTINUOUS BATCHING. A request in the batch hits its stop token and leaves; its 1.9 GB of KV is freed and a queued request is admitted into the free slot mid-flight. Static batching would have made the whole batch wait for the slowest generation — GPUs idling on finished sequences is the waste this eliminates.',
            stack: [
              { name: 'req #7 finished', value: 'KV freed' },
              { name: 'new req admitted', to: 'kv' },
            ],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'unchanged' },
              { id: 'kv', value: 'KV cache: 25.4 / 45 GB', label: 'slot recycled instantly' },
            ],
          },
          {
            note: 'PRESSURE. Long conversations push KV cache to 44 of 45 GB. No new request can be admitted regardless of idle compute — you are memory-bound, not compute-bound. Queue depth and TTFT climb; THOSE are the autoscale signals. GPU utilization looks high and healthy the whole time, which is why scaling on CPU or GPU-util is wrong here.',
            stack: [{ name: 'admission blocked', danger: true, value: 'queue depth 90, TTFT 4 s' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'resident' },
              { id: 'kv', value: 'KV cache: 44 / 45 GB', label: 'FULL — the real ceiling', danger: true },
            ],
          },
          {
            note: 'Done. The stop token fires, the final SSE frame closes the stream, and the KV cache for that conversation is released. If the client had disconnected at token 40, cancellation must free this memory immediately — otherwise abandoned generations hold slots for their full max_tokens, and abandonment rates on chat UIs are not small.',
            stack: [{ name: 'stream closed', value: '512 tokens, 9.1 s' }],
            heap: [
              { id: 'w', value: 'weights int4: 35 GB', label: 'resident for next request' },
              { id: 'kv', value: 'KV cache: 42.1 / 45 GB', label: '1.9 GB released' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'B · Deep dive 1 — prefill and decode are two different machines',
      md: `*Try it first: a request has a 2,000-token prompt and generates 500 tokens. Which phase is limited by arithmetic, and which by memory bandwidth? Why does the answer change how you batch?*

- **Prefill** processes the entire prompt in one pass — every token in parallel, big dense matrix multiplies. It is **compute-bound**: ~2 × params FLOPs per prompt token, so 2,000 tokens × 140 GFLOP ≈ **280 TFLOP**, roughly 0.7 s at 400 TFLOP/s effective. It saturates the GPU's arithmetic units with a single request.
- **Decode** produces one token at a time, and each step must read **all** the model weights to produce that one token. It is **memory-bandwidth-bound**: 35 GB of int4 weights at ~3 TB/s ≈ 12 ms per step, so ~85 tokens/s at batch size 1 — with the arithmetic units almost idle.
- **The consequence**: that same 12 ms weight read serves the *entire batch*. Batch 32 produces 32 tokens for the price of one weight read. Decode throughput scales almost linearly with batch size until KV cache bandwidth catches up — which is why batching is not an optimization here, it is the business model.
- **Static batching wastes GPUs badly**: form a batch of 32, and the whole batch runs until the *longest* generation finishes. If 31 requests stop at 50 tokens and one runs to 2,000, thirty-one slots sit computing padding for 1,950 steps. Utilization can easily be under 30%.
- **Continuous (in-flight) batching** fixes it: the scheduler works per *step*, not per batch. A finished sequence leaves and its KV is freed immediately; a queued request is admitted into the free slot on the very next step. This is the single biggest throughput win in LLM serving, and it is a *scheduler* change, not a model change.
- **Mixing the two phases is the scheduling problem.** A prefill is a compute spike that stalls every decode in flight — users mid-stream see their tokens pause. Real serving stacks either run separate prefill and decode pools, or chunk long prefills into pieces interleaved with decode steps, so no single big prompt freezes everyone else's stream. Naming this tradeoff — *TTFT for new requests versus smooth inter-token latency for existing ones* — is what separates a designer from a user of these systems.`,
    },
    {
      type: 'intuition',
      title: 'B · Deep dive 2 — autoscaling something that takes minutes to start',
      md: `*Try it first: traffic doubles in 60 seconds. Your GPU nodes take 5 minutes to become useful. What do you scale on, and what do you do in the meantime?*

- **Do not scale on CPU utilization.** The CPU on an inference node is nearly idle. **Do not scale on GPU utilization either** — a memory-saturated worker rejecting admissions still shows high GPU-util, because the requests it *is* serving keep the SMs busy. The instrument reads healthy while the system fails.
- **Scale on queue depth and TTFT.** Queue depth is the honest leading indicator: it rises the moment arrivals exceed service rate, before any user-visible latency. TTFT is the trailing, user-facing confirmation. Add **KV-cache utilization** as the third signal, because it is the resource that actually runs out.
- **GPU cold start is measured in minutes**, not seconds: provision the instance, pull a container image that is tens of gigabytes, load 35–140 GB of weights into HBM, warm up the kernels. Autoscaling cannot respond to a spike — by the time capacity arrives, the spike is over and you are paying for idle GPUs.
- **So you keep warm capacity.** Run at ~60–70% of peak-tested capacity, with a warm pool of pre-loaded workers. Expensive, and correct: the alternative is dropping traffic for five minutes. Say the number out loud — "I would hold ~30% headroom" — because a designer who claims autoscaling solves this has not operated one.
- **Predictive scaling beats reactive here.** Traffic is strongly diurnal and weekly. Scale on the *forecast* (up at 08:00, down at 02:00) and use reactive signals only for the surprises.
- **Admit or shed at the gateway, never at the GPU.** When capacity is gone, the correct response is an immediate 429 with \`Retry-After\`, not a request that sits in a queue for 30 seconds and then times out — that one consumed a slot and produced nothing. Shed by tier: free tier degrades first, paid tier last. Load shedding and backpressure are the System Design module *Resilience: Idempotency, Retries, Circuit Breakers & Timeouts*; what is specific here is that the resource you are protecting costs a hundred times more than a web server.`,
    },
    {
      type: 'intuition',
      title: 'B · Cost levers, ranked by savings per unit of pain',
      md: `*Try it first: your CFO wants 40% off the inference bill without users noticing. Rank your levers — biggest, cheapest win first.*

1. **Quantization (int8 / int4).** Weights shrink 2–4×, so more of the GPU is free for KV cache, so concurrency per GPU rises — and decode gets faster because there are fewer bytes to read per step. Typically the largest single win. Cost: a measurable quality drop that must be evaluated per task, not assumed away.
2. **Route cheap traffic to a smaller model.** Most requests do not need the 70B model. A 7–8B model is roughly 10× cheaper per token and indistinguishable on short, simple prompts. A small classifier (or the tier itself) picks the route. Biggest structural saving; cost is a routing mistake that sends a hard question to a weak model.
3. **Caching.** *Exact prompt cache*: hash the full prompt, return the stored completion — free, safe, and surprisingly effective on system prompts and repeated questions. *Prefix/KV cache*: reuse the computed KV for a shared prefix so a 10-turn chat re-prefills only the newest turn — a huge TTFT and cost win, and it is why the stateless API is affordable. *Semantic cache*: embed the prompt and serve a stored answer for a near-match. Powerful and dangerous — "near" is a similarity threshold, and two prompts that differ by the word *not* are extremely close in embedding space. The staleness caveat is real too: a cached answer about a changing fact ages badly. Use semantic caching with a tight threshold, a short TTL, and a hard exclusion list.
4. **Cap \`max_tokens\` per tier.** Output tokens dominate cost and slot occupancy. Cutting a default from 4,096 to 1,024 for the free tier is a large saving that most users never notice, and it directly raises concurrency.
5. **Continuous batching and higher batch sizes.** Pure throughput per GPU. Already covered; listed here because if it is not on, nothing else matters.
6. **Speculative decoding.** A small draft model proposes k tokens; the big model verifies them in one pass and accepts the prefix that matches. Roughly 2× on latency when acceptance is high, with *identical* output distribution — no quality loss. Cost: extra memory for the draft model and a complex scheduler, and the win collapses when acceptance rates are low.

**The order matters more than the list.** Quantization and model routing are structural and huge; speculative decoding is a latency optimization with real engineering cost. A candidate who leads with speculative decoding is optimizing the wrong end.`,
    },
    {
      type: 'intuition',
      title: 'B · Multi-tenancy, fairness, and what you cut first',
      md: `*Try it first: one customer opens 500 concurrent 8k-token generations. Everyone else's latency triples. What in your design should have prevented that, and what do you do right now?*

- **Rate limit on tokens, not requests.** A requests-per-minute limit is meaningless when one request can be 100× another. Limit **tokens per minute** (input plus output) per key, and count \`max_tokens\` against the budget at admission — not after generation, when the damage is done.
- **Per-tenant concurrency caps** are the direct fix for the scenario: no single key holds more than N in-flight slots per pool, regardless of their token budget. Without this, one customer can monopolize a pool while staying inside their rate limit.
- **Fair queueing, not FIFO.** A single global FIFO lets a bursty tenant occupy the whole queue. Round-robin across tenants (or weighted by tier) so a heavy user's excess waits in *their* lane. Isolate the biggest customers into dedicated pools — noisy-neighbour problems disappear when there is no neighbour.
- **Priority by tier at admission**: paid requests jump the queue; free requests are the first to be shed. This is a business decision that shows up as a scheduler parameter, and stating it that way is exactly right in an interview.
- **What you cut first under cost pressure, in order**: (1) free-tier \`max_tokens\` caps, then (2) free tier routed entirely to the small model, then (3) more aggressive quantization on the free-tier pool, then (4) reduced warm headroom (accepting worse spikes), then (5) queue longer instead of scaling out (accepting worse TTFT). Only after all of that do you touch the paid tier's model quality.
- **The principle**: degrade the cheapest users on the cheapest axis first, and never silently degrade a tier that is paying for a specific model version. Publishing the degradation policy in advance is what makes it an SLA instead of an outage.`,
    },
    {
      type: 'intuition',
      title: 'B · Bottlenecks & tradeoffs — and the sentence that ends both designs',
      md: `*Try it first: one resource caps concurrency, one phase stalls every stream in flight, and one startup time forbids reactive scaling. Name all three from the numbers you computed in step 2, and the tradeoff each one forces on you. If your answer is about FLOPs, you have named the wrong bottleneck.*

- **KV cache memory is the binding constraint**, not FLOPs. Everything about capacity — concurrency, batch size, context length limits, quantization choice — is a fight for GPU memory. If your answer only ever discusses compute, you have missed the actual bottleneck.
- **Long contexts are quadratically painful.** KV grows linearly per token, but attention over it grows with context length, so long conversations get slower *and* crowd out other users. Context limits per tier are a capacity decision dressed as a product feature.
- **Prefill spikes hurt streams in flight.** Chunked prefill or separate pools; either way you are trading TTFT for new requests against smooth inter-token latency for existing ones.
- **Cold start forbids reactive autoscaling.** Warm headroom is a permanent, deliberate cost.
- **The head-of-line problem**: one 4,000-token generation in a batch slows every short request behind it. Continuous batching mitigates it; separate short/long pools eliminate it, at the price of worse overall utilization.
- **The closing script, for either design**: *"The model is one component. The system is the funnel that keeps the model affordable, the feature and logging paths that keep it correct, and the queue and admission control that keep it alive under load. Every one of those is a dial — recall against latency, exploration against today's engagement, cost against quality — and I would instrument all three before tuning any of them."* Say that, and you have given the answer the round is actually scored on.`,
    },
  ],
  quiz: [
    {
      question: 'A 100M-item catalog, a ranking model costing ~2 MFLOP per (user, item) pair, 140,000 feed requests/sec at peak. Why can you not simply score every item for every request?',
      options: [
        { text: 'The model would be too inaccurate at that scale', explanation: 'Accuracy does not change with the number of items scored. The blocker is arithmetic, not quality.' },
        { text: 'The item embeddings would not fit in memory', explanation: 'They fit fine — 100M x 128-d at fp32 is 51 GB, and 12.8 GB at int8. Memory is not the blocker for retrieval; compute for the heavy ranker is.' },
        { text: 'Network bandwidth to fetch 100M items would saturate', explanation: 'You never move item rows for scoring — features live in a store beside the ranker. The cost is the forward passes themselves.' },
        { text: '100M x 2 MFLOP = 200 TFLOP per request; at peak that is ~28 EFLOP/s — about 70,000 accelerators for one feed row', explanation: 'Correct. Doing the arithmetic out loud is the whole point: it proves no model can be made cheap enough, so the candidate SET must shrink. That is what forces the funnel.' },
      ],
      correct: 3,
    },
    {
      question: 'Why is a two-tower model used for candidate generation but NOT for final ranking?',
      options: [
        { text: 'Two-tower models are more accurate, so they are saved for the cheap stage', explanation: 'Backwards. Two-tower is deliberately LESS expressive — that limitation is what buys the speed.' },
        { text: 'Because the item tower does not depend on the user, item vectors precompute offline and retrieval becomes one forward pass plus an index probe — but the towers never interact, so feature crosses are impossible', explanation: 'Correct. The factorization is exactly what makes it fast and exactly what makes it dumb. The cross-encoder ranker restores the interactions, affordably, on ~300 survivors.' },
        { text: 'Two-tower models cannot output a score', explanation: 'They do — the dot product of the two vectors is the score. Its form is the constraint, not its absence.' },
        { text: 'The ranker needs a GPU and the two-tower does not', explanation: 'Both use GPUs for training and often for inference. The distinction is what can be precomputed, not what hardware runs it.' },
      ],
      correct: 1,
    },
    {
      question: 'Your feed service caches responses. Which artifact should be cached, and why?',
      options: [
        { text: 'The final ranked page — it saves the most work', explanation: 'It saves the most work and breaks the most things: near-zero hit rate because it is personalized, instantly stale, and it freezes the A/B model version into the cache.' },
        { text: 'The user feature vector, for hours', explanation: 'User features are exactly what changes fastest after each interaction. Caching them for hours reintroduces staleness where it matters most.' },
        { text: 'The candidate list from stage 1, with a ~10 minute TTL', explanation: 'Correct. Candidate generation is the expensive, slowly-changing stage; ranking is cheap on 300 items and must stay live to react to the last few seconds of behaviour. Seen-filtering is applied after the cache, not baked in.' },
        { text: 'Nothing — personalized systems cannot use caches', explanation: 'The shared, non-personalized artifacts (item metadata, embeddings, trending lists) cache beautifully — one entry serves millions of users.' },
      ],
      correct: 2,
    },
    {
      question: 'A recommender trained purely on logged clicks starts putting mediocre items at position 1 and they get clicked. What is happening?',
      options: [
        { text: 'Data drift — user preferences changed', explanation: 'Drift is real but does not explain a bias tied specifically to the SLOT an item occupied.' },
        { text: 'The ranker is overfitting the training set', explanation: 'Overfitting would show as a train/validation gap. This bias is present in the labels themselves — a better fit makes it worse, not better.' },
        { text: 'The ANN index recall dropped', explanation: 'Recall loss removes good candidates entirely; it does not create a correlation between position and clicks.' },
        { text: 'Position bias: top slots collect clicks regardless of quality, so the model learns "items I rank highly get clicked" — a self-fulfilling loop', explanation: 'Correct. Fixes: log position and use it as a training feature held constant at serving, or reweight examples by inverse propensity. Without logged positions you cannot correct what you cannot measure.' },
      ],
      correct: 3,
    },
    {
      question: 'A 70B model at int4 on an 80 GB accelerator, 80 layers, 8 KV heads, head_dim 128, fp16 KV. Roughly how many concurrent 8,000-token conversations fit?',
      options: [
        { text: '~2', explanation: 'That is the full multi-head-attention figure (64 KV heads → 2.6 MB/token → 21 GB per conversation). Grouped-query attention is exactly what avoids this.' },
        { text: '~17', explanation: 'Correct. Weights take 35 GB, leaving ~45 GB. KV/token = 2 x 80 x 8 x 128 x 2 B = 320 KB, so an 8k conversation is ~2.6 GB → about 17 fit. Memory, not compute, caps concurrency.' },
        { text: '~500', explanation: 'That would need KV cache under 100 KB per conversation. Real per-token KV is 320 KB — three orders of magnitude off.' },
        { text: 'Unlimited — KV cache spills to host RAM', explanation: 'Spilling over PCIe destroys decode latency, which is bandwidth-bound. In practice KV lives in HBM and is the hard ceiling.' },
      ],
      correct: 1,
    },
    {
      question: 'Prefill and decode are described as different workloads. What is the practical consequence for batching?',
      options: [
        { text: 'None — both are matrix multiplies, so one batching strategy suffices', explanation: 'They have opposite bottlenecks: prefill saturates arithmetic units with a single request; decode leaves them idle while waiting on memory. One strategy cannot serve both.' },
        { text: 'Prefill is memory-bound and decode is compute-bound, so decode should not be batched', explanation: 'Exactly reversed — and batching decode is the single biggest throughput win in LLM serving.' },
        { text: 'Prefill is compute-bound (one request saturates the GPU) while decode is bandwidth-bound (one weight read serves the whole batch), so they are batched separately, and long prefills are chunked so they do not stall streams in flight', explanation: 'Correct. Batching helps decode enormously and prefill barely at all; mixing them naively means every new prompt pauses everyone else\'s token stream.' },
        { text: 'Both should use static batching for predictability', explanation: 'Static batching makes the whole batch wait for the longest generation — 31 slots computing padding while one request runs to 2,000 tokens. Continuous batching exists to kill exactly this.' },
      ],
      correct: 2,
    },
    {
      question: 'Which signal should trigger autoscaling of an LLM inference pool?',
      options: [
        { text: 'Queue depth and time-to-first-token, with KV-cache utilization as a third signal', explanation: 'Correct. Queue depth leads, TTFT confirms user impact, and KV-cache utilization tracks the resource that actually runs out. And because GPU cold start takes minutes, these signals feed warm headroom and forecasts, not pure reactive scaling.' },
        { text: 'CPU utilization on the inference nodes', explanation: 'The CPU is nearly idle on an inference node — it will never trip a threshold no matter how badly the pool is failing.' },
        { text: 'GPU utilization', explanation: 'The trap answer. A worker whose KV cache is full and is rejecting admissions still shows high GPU-util from the requests it is already serving. The instrument reads healthy while the system fails.' },
        { text: 'Request count per second', explanation: 'Requests vary in cost by 100x — a 100-token and a 100,000-token request are one request each. Token throughput and queue depth carry the real signal.' },
      ],
      correct: 0,
    },
    {
      question: 'You need 40% off the LLM inference bill. Which lever should you reach for FIRST?',
      options: [
        { text: 'Speculative decoding', explanation: 'A genuine ~2x latency win with no quality loss, but it needs a draft model, extra memory, and a complex scheduler — and the win collapses at low acceptance rates. It is a refinement, not the first move.' },
        { text: 'Semantic caching of prompts', explanation: 'Real savings, real danger: "similar" is a threshold, and two prompts differing by the word "not" sit close in embedding space. Worth doing with a tight threshold and short TTL — but not the biggest or safest lever.' },
        { text: 'Quantization plus routing cheap traffic to a smaller model', explanation: 'Correct. Quantization shrinks weights 2-4x, which frees GPU memory for KV cache (higher concurrency) and speeds bandwidth-bound decode. Routing most traffic to a ~10x cheaper small model is the biggest structural saving. Both are large and well-understood; you tune the rest afterwards.' },
        { text: 'Buy more GPUs to reduce queueing', explanation: 'That increases the bill. Queueing is a latency problem, not a cost problem.' },
      ],
      correct: 2,
    },
  ],
  interviewQuestions: [
    {
      question: 'Design the recommendation system for a video platform: 100M videos, 200M daily users. Take me from the request to the rendered page.',
      answer:
        'Start with the number that decides the design: 200M users x 20 sessions = 4B requests/day, ~140k QPS peak, and a real ranker costs ~2 MFLOP per (user, item) pair. Scoring all 100M items per request is 200 TFLOP — about 70,000 accelerators at peak. So the model cannot get cheap enough; the candidate set must get small. That is a four-stage funnel: candidate generation 100M → ~1,000 in ~25 ms (ANN over a two-tower embedding, plus collaborative-filtering neighbours, follows, and trending — several sources so no one model\'s blind spot is the system\'s); filtering → ~300 in ~5 ms (seen-set Bloom filter, blocks, policy, region — hard rules, never learned); ranking ~300 items in one batched forward pass of a heavy cross-feature model, ~45 ms; re-ranking to 10 in ~10 ms for diversity, freshness slots, and ads. Total ~85 ms inside a 100 ms service budget. Each stage is cheaper per item and dumber than the next — precision gets more expensive as the set shrinks. Supporting pieces: an online feature store on the critical path (its p99 is my p99), impression logging with request_id, position, source and model_version so tomorrow\'s training set has negatives and position information, and a candidate-list cache with a 10-minute TTL — never a cache of the final ranking. The tradeoff I would volunteer: the funnel is one-way, so anything stage 1 misses no ranker can recover — I would monitor retrieval recall against a brute-force sample, not just latency.',
      isCaseBased: true,
    },
    {
      question: 'Explain the two-tower model and why its main weakness is acceptable.',
      answer:
        'A user tower maps user features to a vector, an item tower maps item features to a vector, and relevance is their dot product. The critical property is that the item tower does not depend on the user, so all 100M item vectors are computed offline in batch and loaded into an ANN index; at request time you run one forward pass (the user tower) and probe the index. That is what turns 100M model evaluations into one evaluation plus a sublinear probe. The weakness is structural: the towers never see each other before the dot product, so the model cannot express user-item feature interactions — "likes long videos only on weekends" is inexpressible. This is acceptable precisely because retrieval only needs to be approximately right about 1,000 items out of 100M; the cross-encoder ranker in stage 3 restores full interaction modelling on ~300 survivors, where it costs 0.6 GFLOP instead of 200 TFLOP. The split of labour — a dumb model at scale, a smart model at the bottleneck — is the design.',
      isCaseBased: false,
    },
    {
      question: 'Case: you launch a new ranking model. Offline NDCG is up 8%. A week after launch, click-through rate is DOWN 5%. Diagnose it.',
      answer:
        'I would work through five hypotheses in order of likelihood. (1) Training/serving skew — the most common cause. A feature computed one way in the Spark training job and another way in the serving path is silent and devastating: compare the distribution of each feature between the training set and production logs; a shifted mean on one feature is usually the whole story. (2) Point-in-time leakage in the training set — if a feature like item_total_likes was joined at today\'s value rather than as-of the impression timestamp, the model learned from the future and offline NDCG is inflated. (3) The offline/online gap itself: offline replay only has labels for items the OLD model chose to show, so the new model\'s genuinely different picks were unscorable — offline NDCG measured agreement with the old policy, not quality. (4) Metric mismatch: NDCG on predicted clicks is not CTR on a real page after diversity rules, ads, and freshness slots — the re-ranker may be undoing the model\'s gains, or the model may have collapsed onto one content type that the diversity cap then filters out. (5) Feedback and novelty effects — check whether the drop is uniform or concentrated in one segment, one surface, or new users. Process answer: I would confirm it is the model by checking the A/B holdout rather than week-over-week numbers, look at the per-segment breakdown before touching code, and if skew is confirmed, roll back and fix the feature definitions in the feature store so both paths share one definition.',
      isCaseBased: true,
    },
    {
      question: 'Why is the logging schema part of the API design for a recommender, and what breaks if you get it wrong?',
      answer:
        'Because the logs ARE the training set — a design that ships without them has no path to a second model. Every impression must carry request_id, position, candidate_source, and model_version, and every engagement event must echo the request_id. Three things break otherwise. Negatives: a click is a positive, but the nineteen items shown and not clicked are your negatives; lose the impression join and you train on positives only, which teaches the model nothing about what to avoid. Position bias: top slots get clicked regardless of quality, so without logged positions you cannot correct it and the model learns to predict its own ranking. Attribution: without model_version you cannot say which model produced which behaviour after a launch, so every regression investigation starts blind. The general principle worth stating: in ML systems the observability requirements are functional requirements, because the system\'s next version is built from its own output.',
      isCaseBased: false,
    },
    {
      question: 'Case: engagement on your feed is flat, but the fraction of the catalog that ever gets shown has dropped from 30% to 4% over a year. What is happening and what would you do?',
      answer:
        'This is the feedback loop eating itself — popularity bias plus filter bubbles. The model shows what it predicts will be clicked; those items get engagement; that engagement is the next training set; the pool narrows. It compounds with item cold start: new items have no engagement, so they are never retrieved, so they never get engagement. Flat engagement is not reassuring here — the leading indicator is exactly the catalog-coverage number you already have, and churn follows it by months. Fixes, in order: (1) exploration — reserve ~5% of slots for under-explored items, either epsilon-greedy or a bandit that scores by upper-confidence bound so uncertainty earns impressions; (2) make new items retrievable at upload by keeping the item tower on content features (title, category, creator, thumbnail embedding) rather than a pure id embedding, which cannot cold start by construction; (3) diversity constraints in the re-ranker — cap items per creator and per category so the page cannot collapse; (4) add catalog coverage and new-item impression share to the dashboard as first-class metrics, alongside CTR. The tradeoff I would defend explicitly: exploration costs real engagement today. I would size it by A/B — measure how much CTR 5% exploration actually costs and what it buys in coverage and new-item ramp — and argue it as an investment in the discoverable catalog, which is the asset the product is built on.',
      isCaseBased: true,
    },
    {
      question: 'Walk me through the GPU memory budget for serving a 70B model, and tell me what actually limits concurrency.',
      answer:
        'Two consumers. Weights: 70B parameters times bytes per parameter — 140 GB at fp16, 70 GB at int8, 35 GB at int4. On an 80 GB card, fp16 does not fit at all (2-4 cards with tensor parallelism), int8 fits with ~10 GB spare, int4 fits with ~45 GB spare. Then the KV cache, which is per-token, per-user state: for a 70B-class model with 80 layers, 8 grouped-query KV heads and head_dim 128, one token costs 2 (K and V) x 80 x 8 x 128 x 2 bytes = 320 KB. An 8,000-token conversation is therefore ~2.6 GB for a single user. So the int4 configuration\'s 45 GB of headroom holds about 17 concurrent 8k conversations, or ~34 at 4k average. That is the answer: concurrency is bounded by KV-cache memory, not by FLOPs. The number that makes the point: with full multi-head attention instead of grouped-query, the same model costs 2.6 MB per token — 21 GB per conversation, two users per GPU. An architecture decision inside the model dictates your capacity planning, which is why quantization is the top cost lever: it buys KV-cache space, which buys concurrency, which is throughput.',
      isCaseBased: false,
    },
    {
      question: 'Case: cut LLM serving cost 40% without a quality regression users would notice. Rank your levers and defend the order.',
      answer:
        'I would rank by savings per unit of risk. First, quantization — int8 or int4 shrinks weights 2-4x, which both frees GPU memory for KV cache (directly raising concurrency) and speeds up decode, which is bandwidth-bound. It is usually the single largest win; the cost is a quality drop I would measure per task rather than assume away, and I would quantize the free-tier pool before the paid one. Second, model routing — most traffic does not need the 70B model; a 7-8B model is ~10x cheaper per token and indistinguishable on short simple prompts. A small classifier or the tier itself picks the route; the risk is misrouting a hard prompt, mitigated by escalation on low confidence. Third, caching: an exact prompt cache is free and safe and hits surprisingly often on system prompts; prefix/KV caching means a 10-turn chat re-prefills only the newest turn, a large TTFT and cost win. Semantic caching I would add cautiously — "similar" is a threshold, and two prompts differing by the word "not" are very close in embedding space, plus cached answers about changing facts go stale — so tight threshold, short TTL, exclusion list. Fourth, max_tokens caps per tier: output tokens dominate cost and slot occupancy, and dropping the free-tier default from 4,096 to 1,024 is a big saving most users never see. Fifth, continuous batching, which is table stakes — if it is off, nothing else matters. Only then speculative decoding: real ~2x latency with identical output distribution, but it needs a draft model, extra memory, and a complex scheduler, and the win collapses at low acceptance. If pressed on where I would NOT cut: paid-tier model version, because customers pin versions and silently swapping one is a trust failure, not a cost saving.',
      isCaseBased: true,
    },
    {
      question: 'What is continuous batching, and what specifically does static batching waste?',
      answer:
        'Static batching forms a batch of N requests and runs it until the longest generation in it finishes. If 31 requests stop at 50 tokens and one runs to 2,000, thirty-one slots compute padding for 1,950 steps — utilization can fall under 30%, and no new request can start until the batch drains. Continuous (in-flight) batching schedules per decode STEP instead: a finished sequence exits immediately, its KV cache is freed, and a queued request is admitted into that slot on the very next step. The batch composition changes constantly. Two things make this the biggest throughput win in LLM serving: decode is memory-bandwidth-bound, so one weight read serves the entire batch (keeping the batch full is nearly free throughput), and generation lengths vary wildly, so the static-batching waste is not a corner case, it is the norm. The complication to name is prefill: a new admission needs a compute-bound prefill pass that stalls decode for everyone in flight, so real stacks either use separate prefill and decode pools or chunk long prefills and interleave them — trading TTFT for new requests against smooth inter-token latency for existing ones.',
      isCaseBased: false,
    },
    {
      question: 'Case: one customer opens 500 concurrent long generations and everyone else\'s latency triples. Fix it now, and fix it structurally.',
      answer:
        'Immediately: apply a per-tenant concurrency cap on that key so it holds at most N in-flight slots per pool, and drain the excess back to the queue. That is a config change, not a deploy. Structurally, four things. (1) Rate limit on TOKENS per minute, not requests — a requests-per-minute limit is meaningless when one request can be 100x another, and max_tokens should be charged against the budget at admission, before generation, not after the damage. (2) Per-tenant concurrency caps as a standing policy, because a tenant can monopolize a pool while staying comfortably inside a token rate limit. (3) Fair queueing instead of global FIFO — round-robin across tenants, weighted by tier, so a bursty tenant\'s excess waits in their own lane rather than in front of everyone. (4) Isolate the largest customers into dedicated pools: the noisy-neighbour problem disappears when there is no neighbour, at the cost of worse aggregate utilization, which is a fine trade for a top account. I would also add admission control at the gateway so that when the pool is saturated we return 429 with Retry-After rather than queueing a request for 30 seconds — a request that waits 30 seconds has already failed the user and consumed a slot for nothing. The tradeoff to state: fair queueing and dedicated pools both reduce overall GPU utilization. I would take that, because tail latency for everyone else is the thing customers actually churn over.',
      isCaseBased: true,
    },
    {
      question: 'Why can you not autoscale an LLM inference fleet the way you autoscale a web service?',
      answer:
        'Three reasons. First, the signals are wrong: CPU utilization is near zero on an inference node, and GPU utilization is actively misleading — a worker whose KV cache is full and is refusing admissions still shows high GPU-util from the requests it is already serving, so the instrument reads healthy while the system fails. The right signals are queue depth (leading), time-to-first-token (user-facing confirmation), and KV-cache utilization (the resource that actually runs out). Second, cold start is minutes, not seconds: provision the instance, pull a container image that is tens of gigabytes, load 35-140 GB of weights into HBM, warm the kernels. By the time capacity arrives the spike is over. Third, the unit of capacity is memory, not requests, so "add 20% more pods" does not map cleanly onto "serve 20% more traffic" when traffic composition (context lengths) changes. What you do instead: keep warm headroom — run at roughly 60-70% of peak-tested capacity with pre-loaded workers, which is expensive and correct; scale predictively on the diurnal and weekly forecast, using reactive signals only for surprises; and shed at the gateway with 429 plus Retry-After, degrading free tier first, rather than letting the queue absorb load it can never work off.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the ranking system for a food-delivery app\'s restaurant list. What changes from the video-feed design?',
      answer:
        'The seven-step method is identical; three constraints change the answer. (1) The candidate set is geographically bounded — only restaurants that deliver to this address are eligible, typically hundreds to a few thousand, not 100M. That collapses stage 1: a geo index (geohash or S2 cells) plus a deliverability filter IS candidate generation, and an ANN embedding index is optional rather than load-bearing. Say this explicitly, because reflexively importing the video funnel here is the mistake. (2) Availability is real-time and it is a hard filter, not a score: closed, paused, out of delivery radius, currently 60 minutes behind — these must be applied fresh, which means the seen/eligibility filter reads live state rather than a cached list, and my candidate cache TTL drops to seconds or disappears for this surface. (3) The objective is multi-term and partly non-ML: predicted conversion, yes, but also delivery time, order value, and marketplace fairness — new restaurants must get impressions or they never accumulate the ratings that would earn them impressions, which is item cold start with a business consequence. So the re-ranker carries real weight here: diversity across cuisines, a slot for new or under-exposed restaurants, sponsored placements clearly separated. What stays the same: impression logging with request_id and position (position bias is if anything stronger on a short list), an online feature store for live prep-time and rating features with skew protection, offline ranking metrics as a filter before an A/B on the real business metric — which here is completed orders, not clicks. The tradeoff to defend: optimizing purely for predicted conversion concentrates orders on a handful of established restaurants and starves supply, so I would carry an explicit exploration and fairness budget and measure it as marketplace health, not as a CTR cost.',
      isCaseBased: true,
    },
    {
      question: 'Both systems here are "ML systems". What do they have in common as SYSTEM design problems?',
      answer:
        'Four things, and naming them is what turns two case studies into a transferable method. (1) The model is never the system. In the recommender the design is the funnel that keeps the model affordable; in LLM serving it is the queue, admission control, and batching that keep GPUs alive. Time spent on model architecture in a system design round is time spent failing it. (2) The binding constraint is never the obvious one: the recommender is bounded by how many items you dare score, LLM serving by KV-cache bytes rather than FLOPs. In both, the first job is to do the arithmetic that finds the real ceiling. (3) Cost is a first-class requirement, not a postscript — GPU-hours dominate, so architecture decisions (funnel depth, quantization, model routing) ARE cost decisions, and you should present them as such. (4) The feedback path is part of the design: impression logs are the recommender\'s next training set, and request logs are the LLM stack\'s capacity plan and billing record. In both, observability is a functional requirement because the system\'s next version is built from its own output. And in both, the honest answer to "is it working?" is an online experiment, never an offline number.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why a recommender needs a funnel (the number)', back: '100M items x ~2 MFLOP/pair = 200 TFLOP per request; at 140k QPS that is ~70,000 GPUs. Ranking only ~300 survivors is 0.6 GFLOP — same model, ~333,000x less work. You cannot shrink the model enough; you shrink the candidate set.' },
    { front: 'The four funnel stages, with counts and budgets', back: 'Candidate generation 100M→~1,000 (~25 ms) · filtering →~300 (~5 ms) · ranking ~300 scored (~45 ms) · re-rank →10 (~10 ms). Each stage is cheaper per item and dumber than the next.' },
    { front: 'Two-tower retrieval: the trick and the price', back: 'Trick: the item tower does not depend on the user, so 100M item vectors precompute offline into an ANN index; one user-tower pass at request time. Price: no user-item feature interactions — the cross-encoder ranker restores them on ~300 items.' },
    { front: 'Training/serving skew and point-in-time correctness', back: 'Skew: training and serving compute the "same" feature differently — silent, no error. Point-in-time: a training row must use the feature value AS OF the event timestamp, or you leak the future. A feature store gives one definition, two access paths (offline warehouse, online KV).' },
    { front: 'Cache the candidates, not the ranking', back: 'Final ranked page: near-zero hit rate, instantly stale, and it freezes the A/B model version. Candidate list: expensive and slow-changing → cache ~10 min. Apply seen-filtering AFTER the cache, never bake it in.' },
    { front: 'Position bias, popularity bias, and the fix', back: 'Top slots get clicked regardless of quality; popular items get shown so get popular; new items starve. Fix: log position and correct for it, plus exploration (epsilon-greedy or bandits) — pay a few % of engagement today to keep the catalog discoverable.' },
    { front: 'Why offline wins lose online', back: 'Offline you only have labels for what the OLD model showed, offline optimizes predicted clicks not the business metric, and offline has no feedback loop. Offline metrics filter what deserves an A/B test — they never replace one.' },
    { front: 'LLM GPU memory: weights + KV cache', back: '70B: fp16 140 GB, int8 70 GB, int4 35 GB. KV per token = 2 x layers x kv_heads x head_dim x bytes = 320 KB for an 80-layer GQA-8 model → an 8k conversation is 2.6 GB. On an 80 GB card at int4: ~17 concurrent 8k users. Memory, not FLOPs, caps concurrency.' },
    { front: 'Prefill vs decode', back: 'Prefill: whole prompt in one pass, compute-bound, ~2 x params FLOPs per prompt token — this is TTFT. Decode: one token per step, memory-bandwidth-bound, one weight read serves the whole batch — which is why batching is the economics. Batch them separately; chunk long prefills.' },
    { front: 'Autoscale LLM pools on what, and why warm capacity', back: 'Queue depth (leading) + TTFT (user-facing) + KV-cache utilization. NOT CPU (idle) and NOT GPU-util (looks healthy while admissions are refused). Cold start is minutes, so hold ~30% warm headroom, forecast diurnally, and shed at the gateway with 429 + Retry-After.' },
  ],
  mindmapMarkdown: `- Recommendations & LLM Serving at Scale
  - Method: requirements, estimation, API, data, HLD, deep-dives, bottlenecks
  - A · Recommendation feed
    - Requirements: personalized, fresh, diverse, ~100 ms, cold start both sides
    - Estimation: score all 100M = 70,000 GPUs; top 300 = 0.2 GPUs
    - The funnel 100M to 1,000 to 300 to 10
      - Generate: ANN + CF + follows + trending (~25 ms)
      - Filter: seen-set, policy, region (~5 ms)
      - Rank: heavy cross-feature model on ~300 (~45 ms)
      - Re-rank: diversity, freshness, ads (~10 ms)
    - Two-tower: item vectors precompute offline, no feature crosses
    - Cold start: content features for items, context for users
    - Feature store: online vs offline, skew, point-in-time
    - Cache candidates, never the ranking
    - Logging is the API: request_id, position, source, model_version
      - Position bias, popularity bias, filter bubble
      - Exploration: epsilon-greedy, bandits
    - Offline NDCG filters; the A/B decides
  - B · LLM serving
    - 70B weights: 140 / 70 / 35 GB at fp16 / int8 / int4
    - KV 320 KB per token, 2.6 GB per 8k user, ~17 per GPU
    - Gateway: auth, token rate limits, admission control
    - Router by model and tier, queue, GPU pools, SSE stream
    - Prefill compute-bound (TTFT) vs decode bandwidth-bound
    - Continuous batching beats static; chunk long prefills
    - Scale on queue depth + TTFT, never CPU or GPU-util
    - Cold start is minutes, so hold ~30% warm headroom
    - Cost order: quantize, route small, cache, cap max_tokens, speculate
    - Fairness: token limits, per-tenant caps, fair queueing
    - Under pressure, cut the free tier first
  - Both: the model is one box; the logs are the next version`,
}

export default m
