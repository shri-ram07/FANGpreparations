# MASTER STUDY PLAN — AIML Engineer, FAANG-Ready
### From absolute basics → super advanced | Built for a B.Tech AIML student

> This file is the **single source of truth**. The learning website is built from it. Every subject below has: a roadmap (Level 0 → Level 3), practicals, interview themes, best free resources, and a mind-map spec for revision.

---

## 1. THE LEARNING CONTRACT (how every topic must be taught)

These rules apply to **every module** on the website. Non-negotiable.

1. **Never assume prior knowledge.** Every concept starts from zero. If a lesson uses the word "tensor", the lesson (or a 2-line recap box) explains what a tensor is first.
2. **Simple language only.** Short sentences. If a 12-year-old can't follow the first paragraph, rewrite it.
3. **Hinglish for hard concepts only.** When a concept is genuinely hard (backprop, attention, virtual functions, B+ trees, CAP theorem), add a Hinglish intuition box — e.g. *"Attention ka matlab: har word baaki sab words se poochta hai — 'tu mere liye kitna important hai?' — aur importance ke hisaab se unka meaning mix kar leta hai."* Easy topics stay in plain English. Hinglish is a tool, not a style.
4. **Point-to-point, never lengthy.** Max 5–7 bullets per idea. One screen = one idea. No essay-style theory.
5. **Intuition → Visual → Math → Code → Quiz.** Every concept follows this exact order. Math is optional-expandable, never a wall.
6. **Analogy first.** Every hard concept opens with a real-life analogy (gradient descent = walking downhill blindfolded, feeling the slope with your feet).
7. **Interactive wherever possible.** Sliders, toggles, step-through animations. Learning by touching, not reading.
8. **Every module ends with a visual mind map** — the full module on one screen, used for revision forever.
9. **Every module ends with interview questions** — conceptual + case-based (the "Google asks this" style), answers hidden behind a reveal.
10. **Active recall + spaced repetition.** Each module produces flashcards. The site resurfaces them at 1 day → 3 days → 7 days → 21 days → 60 days. This is the "never forget in my life" mechanism — it is science, not magic.

---

## 2. THE BIG PICTURE — dependency map

Learn in this order because each layer feeds the next:

```
Math intuition + Python & OOP  (the ground floor)
        │
        ├──► C++  ──► DSA (in C++)  ──────────────► daily habit, forever
        │
        ├──► ML algorithms ──► Metrics & Losses ──► Deep Learning ──► GenAI / Transformers
        │
        ├──► DBMS + SQL ──► Backend (Python) ──► System Design (HLD + LLD)
        │
        └──► DevOps ──► MLOps (needs ML + Backend + DevOps together)
```

Three parallel tracks run at the same time:
- **Track A (Problem solving):** C++ → DSA — daily, never stops.
- **Track B (AI core):** Math → ML → Metrics/Losses → DL → GenAI.
- **Track C (Engineering):** DBMS → Backend → DevOps → MLOps → System Design.

---

## 3. PHASE TIMELINE (~12 months, compress or stretch as needed)

| Phase | Months | Focus | Outcome |
|---|---|---|---|
| 0 | 0–1 | Python + OOP, Git, Linux basics, math intuition refresh | Fluent Python, comfortable terminal |
| 1 | 1–3 | C++ from scratch, DSA foundations, SQL basics | 100+ easy/medium problems solved |
| 2 | 3–5 | All ML algorithms + Metrics & Losses, DSA continues | 3 ML projects, Kaggle comfort |
| 3 | 5–7 | Deep Learning + Backend (FastAPI), Docker basics | NN from scratch, deployed ML API |
| 4 | 7–9 | GenAI: transformer from scratch → LLM apps; MLOps practical | Your own mini-GPT, full MLOps pipeline |
| 5 | 9–11 | System Design (HLD+LLD), advanced DSA, DBMS internals | Can design Instagram/Uber on a whiteboard |
| 6 | 11–12 | Interview grind: mocks, revision via mind maps, capstone polish | FAANG-ready |

### Daily rhythm (weekdays)
- **1.5 h** — DSA (1 new problem + 1 revision problem)
- **2–3 h** — current phase subject
- **30 min** — spaced-repetition review queue (flashcards + mind maps)

### Weekend rhythm
- Half day building the current project, half day mock interview / contest (LeetCode weekly, Codeforces).

---
## 4. SUBJECT ROADMAPS

---

### SUBJECT 1 — Python + OOP (the ground floor)

**Why:** Every AI/ML line of code you'll ever write. FAANG ML interviews often include a Python round.

**Level 0 → Fundamentals**
- Variables, data types, operators, input/output
- Conditionals, loops, functions, `*args/**kwargs`
- Strings, lists, tuples, sets, dicts — and *when to use which* (this is the interview part)
- List/dict comprehensions, slicing tricks

**Level 1 → Intermediate**
- File handling, exceptions (`try/except/else/finally`, custom exceptions)
- Modules, packages, virtual environments (`venv`, `pip`)
- Iterators vs generators (`yield`), lambda, `map/filter/sorted(key=)`
- Shallow vs deep copy, mutability traps (the classic `[[0]*3]*3` bug)

**Level 2 → OOP (full depth)**
- Class, object, `__init__`, `self`, instance vs class vs static attributes/methods
- The 4 pillars: Encapsulation, Abstraction, Inheritance (single/multiple/MRO), Polymorphism
- Dunder methods: `__str__`, `__repr__`, `__eq__`, `__len__`, `__getitem__`, `__call__`
- Property decorators, name mangling, `@classmethod` vs `@staticmethod`
- Abstract base classes (`abc`), duck typing, composition vs inheritance

**Level 3 → Advanced**
- Decorators (write your own: timing, caching, auth), closures
- Context managers (`with`, `__enter__/__exit__`)
- `dataclasses`, type hints, `typing` module
- GIL, threading vs multiprocessing vs `asyncio` (conceptual — deep dive in Backend)
- Memory model: reference counting, garbage collection

**Practicals:** Build a bank-account system (OOP pillars), a caching decorator, a CSV data-cleaning tool, a mini ORM-style class.

**Interview themes (FAANG):** mutable default args bug, `is` vs `==`, MRO output questions, "implement an LRU cache class", generator memory advantage, why composition over inheritance.

**Resources:** Corey Schafer (YouTube — OOP playlist), Python official tutorial, ArjanCodes (design), "Fluent Python" (advanced reference).

**Mind map nodes:** Data structures → Functions → OOP 4 pillars → Dunders → Decorators/Generators → Memory & GIL.

---

### SUBJECT 2 — C++ from scratch to advanced

**Why:** The DSA language. Also proves systems depth (Google loves it).

**Level 0 → Basics**
- Compilation model (what `g++` actually does), `main`, I/O, types, `sizeof`
- Control flow, functions, pass-by-value vs pass-by-reference
- Arrays, C-strings vs `std::string`

**Level 1 → Core**
- Pointers (the full story: `*`, `&`, pointer arithmetic, `nullptr`) — *Hinglish zone*
- References vs pointers, dynamic memory (`new/delete`), stack vs heap
- Structs, OOP in C++: classes, constructors/destructors, `this`
- Copy constructor, copy assignment — the Rule of 3

**Level 2 → OOP + STL (the DSA toolkit)**
- Inheritance, virtual functions & vtables (*Hinglish zone*), abstract classes, `override/final`
- Operator overloading, friend functions, `const` correctness
- **STL mastery:** `vector, string, pair, map, unordered_map, set, multiset, stack, queue, priority_queue, deque` + iterators + `sort, lower_bound, upper_bound` + custom comparators
- Templates (function + class), lambdas

**Level 3 → Modern & Advanced**
- Move semantics, rvalue references, Rule of 5 (*Hinglish zone*)
- Smart pointers: `unique_ptr, shared_ptr, weak_ptr` — and why raw `new` is dead
- RAII (the single most important C++ idea), exceptions
- `constexpr`, `auto`, range-based for, structured bindings (C++17)
- Memory layout, undefined behavior classics, basics of multithreading (`std::thread`, mutex)

**Practicals:** Implement `vector` from scratch, a smart-pointer clone, a polymorphic shapes system, a small memory-leak hunt exercise.

**Interview themes:** vtable mechanics, `unique_ptr` vs `shared_ptr`, what happens on `push_back` (amortized doubling), deep vs shallow copy, RAII explanation, diamond problem.

**Resources:** learncpp.com (the bible, free), cppreference.com, "Effective Modern C++" (later), The Cherno (YouTube).

**Mind map nodes:** Memory (stack/heap/pointers) → OOP & virtual → STL containers map → Templates → Smart pointers & RAII → Modern C++.

---

### SUBJECT 3 — DSA (complete, in C++)

**Why:** THE FAANG filter. 60–70% of interview weight for new grads.

**Level 0 → Foundations**
- Time & space complexity, Big-O intuition (visual: how n, log n, n², 2ⁿ grow)
- Arrays: two pointers, sliding window, prefix sums, Kadane
- Strings: hashing basics, palindromes, anagram patterns
- Binary search — on arrays AND on answer space (*Hinglish zone: "answer guess karo, check karo, range aadha karo"*)

**Level 1 → Linear structures**
- Linked lists (reverse, cycle detect — Floyd, merge, LRU cache)
- Stacks (monotonic stack pattern — next greater element family), queues, deque
- Hashing: maps/sets, collision idea, frequency-count patterns

**Level 2 → Non-linear structures**
- Recursion → backtracking (subsets, permutations, N-Queens, Sudoku)
- Trees: traversals (recursive + iterative), BST, LCA, diameter, views, serialize
- Heaps: k-largest patterns, two-heap median, merge k lists
- Tries: prefix problems, word search
- Graphs: BFS/DFS, connected components, cycle detection, topological sort, Dijkstra, Bellman-Ford, Floyd-Warshall, Union-Find (DSU), MST (Prim/Kruskal), bipartite

**Level 3 → The hard stuff**
- Dynamic Programming — the full ladder (*heavy Hinglish + visual zone*):
  1D DP → grid DP → knapsack family → LIS family → string DP (edit distance, LCS) → DP on trees → DP + bitmask → partition DP (MCM)
- Greedy + proof intuition (intervals, Jump Game family)
- Sliding window hard, binary search hard, segment trees / BIT (basics), string algos (KMP, Rabin-Karp)
- Bit manipulation patterns

**Practice ladder:** Striver A2Z sheet (structure) → NeetCode 150 (patterns) → LeetCode top-interview + company-tagged → CSES (quality) → weekly contests.
**Target:** ~400–500 quality problems with pattern notes, not 1000 random ones.

**Interview themes:** every list above IS the interview. Extra: explain-your-complexity out loud, optimize brute → better → best, follow-up variations.

**Resources:** takeuforward (Striver A2Z), NeetCode (videos + roadmap), LeetCode, CSES problem set, VisuAlgo (visualizations).

**Mind map nodes:** Complexity → Array/String patterns → LinkedList/Stack/Queue → Trees/Heaps/Tries → Graphs (algo table) → DP ladder → Greedy/Bits.

---

### SUBJECT 4 — DBMS + SQL (complete)

**Why:** Guaranteed interview topic + foundation for backend and system design.

**Level 0 → Concepts**
- What is a DBMS, file system vs DBMS, 3-schema architecture
- ER model → relational model, keys (primary, foreign, candidate, super, composite)

**Level 1 → SQL (hands-on from day 1)**
- DDL/DML/DCL/TCL, SELECT-WHERE-ORDER-LIMIT
- Aggregations: GROUP BY, HAVING (vs WHERE — classic interview Q)
- **Joins** — inner/left/right/full/self/cross, drawn with Venn + row-level animation
- Subqueries (correlated vs non-correlated), CTEs (`WITH`), views
- **Window functions** — `ROW_NUMBER, RANK, DENSE_RANK, LAG/LEAD, running totals` (FAANG SQL rounds live here)
- Nth-highest-salary family, duplicate handling, date logic

**Level 2 → Design & Theory**
- Functional dependencies, Normalization: 1NF → BCNF with one worked example carried through (*Hinglish zone*)
- Denormalization — when and why real companies do it
- Transactions & ACID, concurrency problems (dirty read, non-repeatable read, phantom)
- Isolation levels, locks (shared/exclusive, 2PL), deadlocks
- Indexing: B-tree vs B+ tree (visual!), clustered vs non-clustered, composite indexes, why index ≠ always faster

**Level 3 → Internals & Scale**
- Query execution: parser → optimizer → plan; reading `EXPLAIN`
- Storage: pages, buffer pool, WAL (write-ahead logging)
- SQL vs NoSQL — document/KV/column/graph, when each wins
- Replication, sharding, partitioning (bridge into System Design)

**Practicals:** design a Zomato-style schema, 50+ SQL problems in the in-browser SQL sandbox, index-speed experiment on a 1M-row table.

**Interview themes:** joins output prediction, WHERE vs HAVING, 2nd highest salary 4 ways, ACID with real examples, B+ tree why, isolation-level scenarios, "design the schema for X".

**Resources:** CMU 15-445 lectures (internals, gold), SQLBolt + SQLZoo (practice), LeetCode SQL 50, use-the-index-luke.com.

**Mind map nodes:** Keys & ER → SQL query anatomy → Joins table → Window functions → Normalization ladder → ACID & concurrency → Indexes & internals.

---

### SUBJECT 5 — Backend Development in Python

**Why:** ML engineers who can ship APIs are 10× more hirable. Also feeds MLOps and System Design.

**Level 0 → Web fundamentals**
- How the internet works: DNS → TCP → HTTP request/response (visual journey of one request)
- HTTP methods, status codes, headers, cookies, JSON
- What is an API, REST principles

**Level 1 → First APIs (FastAPI)**
- FastAPI: routes, path/query params, Pydantic models (validation)
- CRUD app + SQLite → PostgreSQL, ORM with SQLAlchemy
- Project structure, environment configs, error handling

**Level 2 → Real backend**
- Auth: sessions vs JWT (visual token flow), OAuth idea, password hashing
- Middleware, dependency injection, background tasks
- **Async Python properly:** event loop, `async/await`, when async helps and when it doesn't (*Hinglish zone*)
- Testing: pytest, test client, mocking; logging
- Caching with Redis, rate limiting, pagination

**Level 3 → Production**
- WSGI vs ASGI, Gunicorn/Uvicorn workers
- Websockets, server-sent events (for streaming LLM responses!)
- Celery + message queues (task queue pattern)
- Serving ML models: load-at-startup, batching, versioned endpoints

**Practicals:** URL shortener → Notes API with auth → **ML model serving API** (image classifier or sentiment) → streaming chat endpoint for an LLM.

**Interview themes:** REST design of a resource, JWT vs session tradeoffs, N+1 query problem, idempotency, how would you serve a model at 1000 req/s.

**Resources:** FastAPI official docs (excellent), TestDriven.io blog, ArjanCodes, SQLAlchemy docs.

**Mind map nodes:** HTTP anatomy → REST/CRUD → Auth flows → Async model → Data layer & caching → Serving ML.

---

### SUBJECT 6 — Math intuition for ML (embedded foundation)

Not a separate grind — a 3-week visual foundation, then just-in-time inside ML/DL modules.

- **Linear algebra:** vectors, dot product (= similarity!), matrices as transformations, eigen-intuition — 3Blue1Brown "Essence of Linear Algebra"
- **Calculus:** derivative = slope = sensitivity, chain rule (backprop preview), partial derivatives, gradient — 3Blue1Brown Calculus
- **Probability & stats:** distributions, Bayes theorem (visual), expectation/variance, MLE idea
- **Optimization:** what a loss surface is, gradient descent visually

**Mind map nodes:** Vectors & dot product → Matrix = transformation → Derivative & chain rule → Distributions & Bayes → Gradient descent.

---
### SUBJECT 7 — Machine Learning (ALL algorithms)

**Why:** Core of the AIML role. FAANG ML rounds test intuition + math + tradeoffs, not library calls.

**Level 0 → The mental model**
- What "learning" means: function fitting, train/val/test, generalization
- Underfitting vs overfitting (interactive polynomial-degree slider), bias–variance (*Hinglish zone: "bias = model ki soch hi galat, variance = model har baar mood badalta hai"*)
- The ML workflow: data → features → model → evaluate → iterate

**Level 1 → Supervised: Regression**
- Linear regression: hypothesis, MSE loss, **gradient descent step-by-step** (interactive slider on a real loss surface), normal equation
- Polynomial regression, Ridge (L2) vs Lasso (L1) — why L1 makes weights exactly zero (visual diamond vs circle)
- Evaluation preview: MSE, RMSE, MAE, R²

**Level 2 → Supervised: Classification**
- Logistic regression: sigmoid, why cross-entropy not MSE, decision boundary playground
- k-NN (lazy learning, curse of dimensionality), Naive Bayes (spam example, Laplace smoothing)
- SVM: max margin visually, hard vs soft margin, kernel trick (*Hinglish zone: "data ko upar utha ke separate karna"*)
- Decision Trees: entropy/Gini step-by-step split animation, pruning
- **Ensembles:** Bagging → Random Forest (why it works), Boosting → AdaBoost → Gradient Boosting → **XGBoost/LightGBM** (the Kaggle kings), stacking
- Class imbalance: SMOTE, class weights, threshold moving

**Level 3 → Unsupervised + the rest**
- K-Means (step animation, elbow, K-Means++), Hierarchical (dendrograms), DBSCAN (density, finds weird shapes)
- GMM + EM intuition
- Dimensionality reduction: PCA (variance-maximizing rotation, visual), t-SNE/UMAP (for viewing only)
- Anomaly detection (Isolation Forest), association rules (Apriori)
- Feature engineering: scaling (when needed per algorithm — interview favorite), encoding, leakage traps
- Cross-validation (k-fold, stratified, time-series split), hyperparameter tuning (grid/random/Bayesian-Optuna)
- Brief: recommendation systems (collaborative vs content), time-series basics

**Practicals:** implement linear/logistic regression + K-Means **from scratch in NumPy**; 3 end-to-end projects (tabular classification, regression, clustering + PCA); one Kaggle competition entry.

**Interview themes:** bias-variance on a scenario, L1 vs L2, why RF over one deep tree, gradient boosting vs bagging, K-Means failure cases, PCA assumptions, data leakage spotting, "model does great offline, fails in prod — debug it".

**Resources:** Andrew Ng ML Specialization (Coursera, audit free), StatQuest (YouTube — best intuition on earth), "Hands-On ML" by Géron (practice), scikit-learn docs, Kaggle Learn.

**Mind map nodes:** Learning setup & bias-variance → Regression family → Classification family → Ensembles tree → Unsupervised family → Feature eng & CV → Tuning.

---

### SUBJECT 8 — Metrics & Losses (supervised → unsupervised)

**Why:** The #1 topic where candidates get exposed. "Why this loss?" is a guaranteed FAANG question.

**Losses (what the model optimizes)**
- Regression: MSE vs MAE vs Huber (outlier-sensitivity slider), quantile loss
- Classification: Binary cross-entropy (derive from likelihood, gently), categorical CE, label smoothing, focal loss (class imbalance), hinge loss (SVM)
- Ranking/embedding: contrastive, triplet loss (face recognition story)
- DL-specific: KL divergence (*Hinglish zone: "do probability distributions kitne alag hain"*), perplexity (language models), reconstruction loss (autoencoders), ELBO idea (VAE), GAN min-max loss
- Why loss must be differentiable; loss vs metric difference (interview classic)

**Metrics (how humans judge the model)**
- Confusion matrix — the mother of all: **precision, recall, F1** (*Hinglish zone: precision = "jo bola positive, usme se kitne sach me positive"; recall = "jitne sach me positive the, kitne pakde"*)
- Precision-recall tradeoff (interactive threshold slider), when precision matters (spam) vs recall (cancer)
- ROC curve & AUC (built point-by-point interactively), PR-AUC for imbalance
- Regression: R² vs adjusted R², MAPE traps
- Multi-class: micro vs macro vs weighted F1
- Unsupervised: inertia, **silhouette score** (visual), Davies-Bouldin, ARI/NMI
- Ranking/RecSys: Precision@K, MAP, NDCG
- NLP/GenAI: BLEU, ROUGE, perplexity, human-eval idea; CV: IoU, mAP

**Practicals:** compute every metric by hand from one confusion matrix; build ROC from scratch; pick-the-metric case studies (fraud, medical, search ranking).

**Interview themes:** "accuracy 99% but model useless — why?", F1 vs accuracy, ROC-AUC vs PR-AUC on imbalance, design a metric for YouTube recommendations, why cross-entropy over MSE for classification (gradient argument).

**Mind map nodes:** Loss vs metric → Regression losses → Classification losses → Confusion-matrix family → Curves (ROC/PR) → Unsupervised metrics → Ranking & GenAI metrics.

---

### SUBJECT 9 — Deep Learning (ALL algorithms)

**Why:** The engine behind GenAI. FAANG expects from-scratch understanding.

**Level 0 → Neural nets from zero**
- Perceptron → why we need non-linearity → MLP
- Activations: sigmoid, tanh, ReLU family, GELU, softmax — with interactive graphs
- **Forward pass** on a tiny 2-3-1 network with real numbers on screen
- **Backpropagation** = chain rule on a graph (*heavy Hinglish + step-through visual: "galti output pe pakdi, phir peeche har weight se poocha — tera kitna haath tha is galti me?"*)
- Build a NN **from scratch in NumPy** (this is the module that makes you unforgettable in interviews)

**Level 1 → Training deep networks properly**
- Loss surfaces, SGD → Momentum → RMSProp → **Adam/AdamW** (interactive optimizer race on a 2D surface)
- Learning-rate schedules, warmup; vanishing/exploding gradients
- Weight init (Xavier/He), **Batch Norm vs Layer Norm** (visual, interview favorite)
- Regularization: dropout (visual neurons switching off), early stopping, weight decay, data augmentation
- PyTorch fundamentals: tensors, autograd, `nn.Module`, Dataset/DataLoader, training loop anatomy, GPU

**Level 2 → Architectures**
- **CNNs:** convolution as sliding filter (interactive kernel playground), padding/stride, pooling, receptive field; LeNet → AlexNet → VGG → **ResNet (skip connections — why depth became possible)** → brief EfficientNet; transfer learning & fine-tuning
- CV tasks map: classification, detection (YOLO idea, IoU/NMS), segmentation (U-Net idea)
- **RNNs:** why sequences break MLPs, hidden state, BPTT; **LSTM/GRU gates** (*Hinglish zone: gates = "kya yaad rakhna, kya bhoolna, kya bolna"*); seq2seq + the bottleneck problem → attention teaser
- Embeddings: Word2Vec intuition (king − man + woman = queen, interactive)

**Level 3 → Generative & advanced**
- Autoencoders → VAE (latent space visual), GANs (forger vs police game, mode collapse), Diffusion models (noise → image, conceptual)
- Self-supervised learning idea, contrastive learning (SimCLR concept)
- Training at scale: mixed precision, gradient accumulation/clipping/checkpointing, data vs model parallelism (concept)

**Practicals:** NumPy NN from scratch (MNIST); PyTorch CNN (CIFAR-10) + transfer learning; LSTM text generator; tiny GAN on MNIST.

**Interview themes:** derive backprop for one layer, BatchNorm at train vs test, why ResNet works, param counting for conv layers, dropout at inference, Adam vs SGD generalization debate, "training loss falls but val loss rises — full debugging tree".

**Resources:** **Andrej Karpathy "Neural Networks: Zero to Hero"** (the gold standard), 3Blue1Brown NN series (visual), deeplearning.ai DL Specialization, d2l.ai (free book), PyTorch tutorials.

**Mind map nodes:** Neuron → MLP → Backprop → Optimizers & normalization → Regularization → CNN family → RNN/LSTM → Generative (AE/VAE/GAN/Diffusion) → Training at scale.

---

### SUBJECT 10 — GenAI: Transformers from scratch → advanced

**Why:** Your specialization's crown. "Built a GPT from scratch" is a resume line that gets FAANG callbacks.

**Level 0 → The road to attention**
- Tokenization: character → word → **BPE** (build a tiny BPE step-by-step), tokens & context window
- Embeddings recap; why RNNs lost: no parallelism, long-range forgetting
- **Self-attention from zero** (*the heaviest Hinglish + interactive zone*): Query, Key, Value — *"har token ek sawaal (Q) leke ghoomta hai, har token ke paas ek label (K) aur asli maal (V) hai; Q·K match jitna strong, utna us token ka V mix hoga"* — interactive attention heatmap on a real sentence
- Scaled dot-product: why divide by √d; softmax row-wise

**Level 1 → The full Transformer (build it)**
- Multi-head attention (why many heads — different relationships), causal masking (*"future dekhna mana hai"*)
- Positional encoding (sinusoidal → learned → RoPE idea)
- Transformer block: attention → Add&Norm → FFN → Add&Norm (residual stream picture)
- Encoder vs decoder vs encoder-decoder; BERT vs GPT vs T5 family map
- **CAPSTONE: code a GPT from scratch in PyTorch** — tokenizer, attention, blocks, training loop on a small text corpus, sampling (temperature, top-k, top-p) — following Karpathy nanoGPT style, every line explained

**Level 2 → From transformer to LLM**
- Pretraining (next-token prediction at scale), scaling laws idea
- Finetuning: full FT → **LoRA/QLoRA** (visual: tiny adapter matrices), instruction tuning
- **RLHF pipeline:** SFT → reward model → PPO; **DPO** as the simpler modern route (conceptual + diagram)
- Quantization (fp16/int8/int4), KV-cache (why generation gets slow, visual), inference: vLLM concept, speculative decoding idea
- Modern architecture notes: MoE (mixture of experts), GQA, sliding-window attention

**Level 3 → Applied GenAI (the job skills)**
- Prompt engineering: zero/few-shot, chain-of-thought, structured outputs
- **Embeddings & vector DBs:** semantic search, cosine similarity, chunking strategies
- **RAG end-to-end:** load → chunk → embed → retrieve → rerank → generate (+ its failure modes; build one on your own notes)
- **Agents & tool use:** function calling, ReAct loop, MCP concept, multi-step agents
- Evaluation: perplexity, LLM-as-judge, hallucination handling, guardrails/safety basics
- Multimodal concept: CLIP, vision-language models

**Practicals:** tiny BPE tokenizer; GPT from scratch (capstone); finetune a small open model with LoRA (Colab); RAG chatbot over your study notes (FastAPI + streaming — connects Backend!); a tool-using agent.

**Interview themes:** explain attention on a whiteboard, complexity of attention O(n²) and mitigations, why LayerNorm placement matters, KV-cache math, LoRA parameter savings calculation, RAG vs finetuning decision case, hallucination mitigation design, "design ChatGPT's serving stack" (bridges System Design).

**Resources:** **Karpathy Zero to Hero + "Let's build GPT"** (the core), Sebastian Raschka "Build an LLM From Scratch" (book + free GitHub repo `rasbt/LLMs-from-scratch`), Jay Alammar "Illustrated Transformer", poloclub Transformer Explainer (interactive), Hugging Face LLM course + Agents course, Stanford CS224n/CS25, "Attention Is All You Need" + InstructGPT + LoRA + DPO papers (read after building).

**Mind map nodes:** Tokenization → Embeddings → Attention (QKV) → Transformer block → GPT training loop → Finetuning (LoRA) → Alignment (RLHF/DPO) → Inference optimizations → RAG → Agents → Evaluation.

---

### SUBJECT 11 — DevOps + MLOps (complete practical)

**Why:** Models in notebooks = ₹0 value. FAANG ML engineers ship. This track is 80% doing.

**Level 0 → DevOps foundations**
- Linux essentials: filesystem, permissions, processes, `grep/awk/sed` basics, SSH
- **Git properly:** branching, merge vs rebase, PR flow, resolving conflicts (interactive branch visual)
- Networking basics: ports, DNS, HTTP again, firewalls (just enough)

**Level 1 → Containers & CI/CD**
- **Docker:** images vs containers (*Hinglish zone: image = recipe, container = bana hua khana*), Dockerfile line-by-line, layers & caching, volumes, networks, docker-compose
- Containerize: a Python app → the FastAPI ML API from Subject 5
- **CI/CD with GitHub Actions:** lint → test → build → push image → deploy; write the YAML by hand once
- Cloud basics on free tier (AWS/GCP): compute instance, object storage (S3), IAM idea

**Level 2 → MLOps core (the pipeline)**
- Why ML needs special ops: data drift, model decay, reproducibility (the "works in notebook" disease)
- **Experiment tracking with MLflow:** log params/metrics/artifacts, model registry, compare runs
- **Data & model versioning with DVC** (Git for data)
- **Orchestration with Airflow** (or Prefect): DAG that ingests → trains → evaluates → registers
- Model serving patterns: batch vs online vs streaming; FastAPI + Docker serving; canary/shadow deployment concept
- Feature stores (concept), testing ML code (data tests, model tests)

**Level 3 → Production & scale**
- **Kubernetes essentials:** pods, deployments, services, autoscaling (visual cluster diagram); deploy your model on a local k8s (kind/minikube)
- **Monitoring:** Prometheus + Grafana (latency/errors), **Evidently** for data & prediction drift; alerting → auto-retraining loop
- Infrastructure-as-code taste (Terraform hello-world)
- **LLMOps:** prompt versioning, LLM eval pipelines, cost/latency monitoring, semantic caching

**GRAND PRACTICAL (the resume project):** end-to-end pipeline — data ingested by Airflow → tracked in DVC → trained + logged in MLflow → best model containerized → deployed via GitHub Actions to cloud/k8s → monitored with Evidently + Grafana → drift alert triggers retraining. This single project answers 15 interview questions by itself.

**Interview themes:** Docker image vs container, what happens on `git rebase`, blue-green vs canary, how do you detect drift, reproducibility guarantees, design a retraining trigger, k8s pod vs deployment.

**Resources:** **DataTalksClub MLOps Zoomcamp** (free, hands-on, the best), Docker & k8s official get-started, MLflow/DVC/Airflow docs, Made With ML (GokuMohandas), roadmap.sh/mlops & roadmap.sh/devops, Full Stack Deep Learning.

**Mind map nodes:** Linux/Git → Docker → CI/CD → Tracking (MLflow) → Versioning (DVC) → Orchestration (Airflow) → Serving → k8s → Monitoring & drift → LLMOps.

---

### SUBJECT 12 — System Design (every concept, HLD + LLD)

**Why:** The senior-signal round. Even new-grad FAANG loops now probe design thinking.

**Level 0 → Building blocks (each one visual)**
- Client-server, vertical vs horizontal scaling
- **Load balancers** (L4 vs L7, algorithms), DNS journey
- **Caching:** browser → CDN → app cache (Redis) → DB cache; eviction (LRU), cache-aside vs write-through; cache stampede
- Databases at scale: replication (leader-follower), **sharding** (+ consistent hashing, animated ring), partitioning
- Message queues (Kafka/RabbitMQ idea): decoupling, backpressure (*Hinglish zone: "queue = dukaan ke bahar ki line — sab ek saath andar nahi ghusenge"*)
- Blob storage + CDN, API gateway, rate limiting algorithms (token bucket, leaky bucket — animated)

**Level 1 → The theory that interviews test**
- **CAP theorem** properly (*Hinglish + partition scenario animation*), PACELC mention
- Consistency models: strong vs eventual; read-your-writes
- SQL vs NoSQL decision framework; when Cassandra, when Mongo, when Postgres
- Indexes at scale, connection pooling, N+1 revisited
- Consensus idea (Raft leader election, conceptual), heartbeats, gossip
- Idempotency, retries + exponential backoff, circuit breakers, timeouts
- Back-of-envelope estimation: QPS, storage, bandwidth (a drilled skill with practice problems)

**Level 2 → HLD case studies (the classics, each a guided interactive walkthrough)**
- URL shortener (the "hello world") → Pastebin
- Twitter/Instagram feed (fanout-on-write vs read)
- WhatsApp/chat (websockets, delivery receipts, online status)
- YouTube/Netflix (upload pipeline, transcoding, CDN)
- Uber (geo-hashing, matching), Google Maps basics
- Search autocomplete (tries at scale), web crawler
- Notification system, rate limiter, distributed ID generator (Snowflake)
- **ML-flavored:** design a recommendation system, design ChatGPT-style LLM serving (ties GenAI + MLOps — your differentiator)

**Level 3 → LLD (low-level design)**
- OOP design principles: **SOLID** (each with a bad→good refactor), DRY/KISS/YAGNI
- Design patterns (the interview set): Singleton, Factory, Strategy, Observer, Builder, Adapter, Decorator — in Python/C++
- LLD classics: Parking Lot, Elevator, BookMyShow, Splitwise, Chess, Snake-Ladder — requirements → classes → relationships (UML-lite) → code skeleton
- Concurrency in design: producer-consumer, readers-writers, designing thread-safe classes

**Practice method:** for every case study — requirements (functional + non-functional) → estimation → API design → data model → HLD diagram → deep-dive 2 components → bottlenecks & tradeoffs. The site should let you attempt each step before revealing the model answer.

**Interview themes:** everything above, plus "your feed is slow — diagnose", "cache invalidation strategy for X", tradeoff defense under follow-up pressure.

**Resources:** **System Design Primer (GitHub, donnemartin)**, Alex Xu Vol 1 & 2, ByteByteGo newsletter/YouTube, "Designing Data-Intensive Applications" (DDIA — the bible, read slowly in phase 5–6), Gaurav Sen / Arpit Bhayani (YouTube), refactoring.guru (patterns).

**Mind map nodes:** Scaling & LB → Caching layers → DB scaling (replication/sharding) → Queues & async → CAP & consistency → Resilience patterns → Estimation → Case-study index → SOLID → Patterns → LLD classics.

---

## 5. CROSS-SUBJECT CAPSTONES (portfolio = interview stories)

1. **Mini-GPT** — transformer from scratch, trained on a small corpus, with a streaming FastAPI + simple UI. *(DL + GenAI + Backend)*
2. **Full MLOps pipeline** — the Subject 11 grand practical. *(ML + DevOps + MLOps)*
3. **RAG study-buddy** — RAG over your own notes with eval harness, deployed in Docker. *(GenAI + Backend + DevOps)*
4. **Scalable API design doc** — take capstone 3 and write its HLD for 1M users. *(System Design)*

## 6. INTERVIEW PREP LAYER (final 2 months)

- **DSA:** 2 timed problems/day + weekly mock (Pramp/peers). Re-solve every "starred" problem from memory.
- **ML/DL/GenAI theory:** the site's question bank (per-module questions get a combined "interview mode" — random 20 across subjects).
- **System design:** 2 mock designs/week, 45-min timer, out loud.
- **Behavioral:** 8 STAR stories written from your projects (conflict, failure, leadership, ambiguity, deadline).
- **Company research:** Google (DSA-heavy + Googleyness), Meta (speed + product sense), Amazon (LPs — map each story to a Leadership Principle).

## 7. THE NEVER-FORGET SYSTEM (how the website enforces memory)

- Every module → flashcards auto-added to the review queue (SM-2 spaced repetition: 1d → 3d → 7d → 21d → 60d).
- Every module → one-screen mind map; "Revision mode" shows only mind maps of everything learned.
- Every concept → one interactive element; you remember what you *touched*.
- Weekly "recall test": blank-page reconstruction of one mind map from memory, then compare.
- Streaks + progress bars per subject on the dashboard (motivation without childish gamification).

*End of master plan. The website must implement everything above — see CLAUDE_CODE_PROMPT.md.*
