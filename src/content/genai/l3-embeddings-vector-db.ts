import type { Module } from '../types'

const m: Module = {
  id: 'genai-l3-embeddings-vector-db',
  subjectId: 'genai',
  level: 3,
  title: 'Embeddings, Vector Databases & Semantic Search',
  whyItMatters:
    'You already know that a piece of text can be turned into a list of numbers, and that two similar texts get similar lists. This module answers the next question: you have ten million of those lists, a user just typed one question, and you have to find the closest few before the page finishes loading. Comparing against all ten million is too slow, and this module measures exactly how too slow. Then it builds the two ideas every vector database is made of, and shows you the price you pay for the speed: the answers stop being exactly right, and you get to choose how nearly right they are.',
  assumes: [
    'You have read the Deep Learning module *Embeddings: Meaning as Vectors*. That is where a vector for a piece of text comes from, and where cosine similarity is explained. This module uses both and does not re-teach them.',
    'You have read the Math module *Vectors & the Dot Product (= Similarity)*, so a dot product is not a new word.',
    'You can read a Python list, a dict, a for loop, and a function definition.',
    'No database background is needed. Every term used here is defined here.',
  ],
  estMinutes: 46,
  sections: [
    {
      type: 'intuition',
      title: 'Ten million documents, one question, and a clock',
      md: `A company has a help centre with **10,000,000 short documents**. Each one has already been turned into a vector — a list of **768 numbers** — by an embedding model. A user types *"how do I get my money back"*, that question becomes its own list of 768 numbers, and the job is to hand back the handful of documents whose vectors sit closest to the question's vector.

- Finding the documents whose vectors sit closest to the query's vector is called **semantic search**: search that matches on meaning rather than on shared words. The user typed "money back" and the right document may only ever say "refund".
- Each document whose vector is close to the query's vector is called a **nearest neighbour** of the query. "Nearest" means most similar under whatever similarity you chose — for text, almost always cosine similarity.
- The obvious way to find them: compare the query against document 1, then document 2, then document 3, all the way to document 10,000,000, keep the best few. This is called a **brute-force scan**, or **exact search**, because it looks at everything and therefore cannot be wrong.
- Count the arithmetic in one such scan. Each comparison multiplies 768 pairs of numbers and adds them up. So one query costs 10,000,000 x 768 = **7,680,000,000** multiply-and-add operations. Nearly eight billion, for one person pressing Enter once.
- We will run that scan, time a small piece of it, and scale the number up. Then we will spend the rest of the module getting rid of it.`,
    },
    {
      type: 'intuition',
      title: 'The six documents we will use all the way through',
      md: `Ten million vectors of 768 numbers are impossible to read. So the whole module uses six documents and three numbers each. The three numbers are made up, but treat them as a real embedding model's output: **position 1 = how much this text is about money, position 2 = how much it is about delivery, position 3 = how much it is about accounts.**

- \`refund\` — "How do I get a refund?" — vector **[0.9, 0.1, 0.2]**
- \`package\` — "Where is my package?" — vector **[0.1, 0.9, 0.1]**
- \`password\` — "Reset my password" — vector **[0.1, 0.0, 0.9]**
- \`payment\` — "Payment failed at checkout" — vector **[0.8, 0.2, 0.3]**
- \`delivery\` — "Track my delivery" — vector **[0.2, 0.9, 0.0]**
- \`email\` — "Change my email address" — vector **[0.0, 0.1, 0.9]**

The user's question is *"how do I get my money back"*, and the same embedding model turns it into **[0.85, 0.05, 0.15]** — heavily about money, barely about anything else. Everything below is these seven lists of three numbers.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: cosine similarity, written out with plain loops',
      code: `def dot(a, b):
    total = 0.0
    for i in range(len(a)):
        total = total + a[i] * b[i]
    return total

def length(a):
    return dot(a, a) ** 0.5

def cosine(a, b):
    return dot(a, b) / (length(a) * length(b))

print(round(cosine([0.9, 0.1, 0.2], [0.85, 0.05, 0.15]), 4))
print(round(cosine([0.1, 0.9, 0.1], [0.85, 0.05, 0.15]), 4))

# ---- real output ----
# 0.9978
# 0.1841`,
      annotations: {
        1: 'Defines a function taking two lists of numbers, a and b, of the same length.',
        2: 'A running total, starting at 0.0. Written as 0.0 rather than 0 to make clear it accumulates decimals.',
        3: 'len(a) is how many numbers are in the list — 3 here. range(len(a)) gives the positions 0, 1, 2.',
        4: 'Multiply the two numbers sitting at the same position and add the product to the total. Doing this for every position is what a dot product is.',
        5: 'Hand back the accumulated total.',
        7: 'Defines the length of a vector — how far its arrow reaches from the origin.',
        8: 'A vector dotted with itself gives the sum of its squares, and ** 0.5 raises that to the power one half, which is a square root. This is Pythagoras in as many dimensions as you like.',
        10: 'Defines cosine similarity, the similarity measure the Deep Learning embeddings module introduced.',
        11: 'Dot product divided by both lengths. Dividing by the lengths removes the effect of size, so only direction is left: 1.0 means the two vectors point the same way, 0.0 means unrelated.',
        13: 'Score the refund document against the query. round(x, 4) cuts the float to 4 decimal places so it prints readably.',
        14: 'Score the package document against the same query. Refund gets 0.9978 and package gets 0.1841 — the numbers agree with what you would say by eye.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: the brute-force scan, all six documents, ranked',
      code: `docs = ['refund', 'package', 'password', 'payment', 'delivery', 'email']
vecs = [[0.9, 0.1, 0.2], [0.1, 0.9, 0.1], [0.1, 0.0, 0.9],
        [0.8, 0.2, 0.3], [0.2, 0.9, 0.0], [0.0, 0.1, 0.9]]
query = [0.85, 0.05, 0.15]

scored = []
for i in range(len(docs)):
    scored.append((cosine(vecs[i], query), docs[i]))

scored.sort(reverse=True)
for score, name in scored:
    print(name, round(score, 4))

# ---- real output ----
# refund 0.9978
# payment 0.9688
# password 0.281
# delivery 0.2697
# package 0.1841
# email 0.1788`,
      annotations: {
        1: 'The six document names, in a fixed order. Position i in this list and position i in the next list describe the same document.',
        2: 'The six vectors. A list whose items are themselves lists — vecs[0] is the whole three-number vector for refund, and vecs[0][1] is its second number.',
        3: 'This is the same line 2 continued. Python allows a list to run across several lines while a square bracket is still open, purely so it fits on the page.',
        4: 'The query vector, produced by the same embedding model from the user\'s question.',
        6: 'An empty list that will collect one entry per document.',
        7: 'Walk every document position: 0, 1, 2, 3, 4, 5. This loop is the brute-force scan in full — it skips nothing.',
        8: 'append adds one item to the end of the list. The item is a tuple, written with round brackets: two values glued together as one, here the score and the name. Score comes first on purpose — see the next line.',
        10: 'sort rearranges the list in place. Sorting a list of tuples compares first items first, so this sorts by score; reverse=True makes it highest-first instead of lowest-first.',
        11: 'Tuple unpacking: each item is a (score, name) pair, and this splits it into two named variables in one step.',
        12: 'Print the document name and its score to 4 decimal places. The order of the output IS the search result.',
      },
    },
    {
      type: 'note',
      md: `Read the ranking. \`refund\` at 0.9978 and \`payment\` at 0.9688 are both about money and both come back high, even though the user typed neither word. Then there is a cliff: everything else sits below 0.29. That cliff is what makes semantic search useful — the meaningful matches separate themselves from the rest. This result is also **exact**: we compared against every document, so nothing better can be hiding anywhere. Remember this exact ranking. It is the yardstick we measure every faster method against for the rest of the module.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Why the scan does not scale: measure a small one and multiply',
      code: `import time

query = []
for j in range(768):
    query.append(0.01 * (j % 100))

library = []
for i in range(2000):
    library.append(query)

start = time.time()
for v in library:
    dot(v, query)
seconds = time.time() - start
print(round(seconds, 3), 'seconds for 2,000 documents')
print(round(seconds * 5000 / 60, 1), 'minutes for 10,000,000 documents')

# ---- real output (one run on a laptop) ----
# 0.05 seconds for 2,000 documents
# 4.2 minutes for 10,000,000 documents`,
      annotations: {
        1: 'time is part of Python itself. It gives us a clock.',
        3: 'Start an empty list that will become one realistic 768-number query vector.',
        4: 'Loop 768 times, once per position in the vector.',
        5: 'Put some number in each position. j % 100 is the remainder when j is divided by 100, so the values cycle 0.00, 0.01, ... 0.99. The actual values do not matter — only how many multiplications they cause.',
        7: 'An empty list that will hold 2,000 document vectors.',
        8: 'Loop 2,000 times.',
        9: 'Append the same query vector 2,000 times. Every one is 768 numbers long, which is all the timing depends on. Building 2,000 genuinely different vectors would only add setup time, not measurement.',
        11: 'time.time() returns the current clock reading in seconds. Save it before the work starts.',
        12: 'Walk all 2,000 document vectors — a brute-force scan, same as before, just bigger.',
        13: 'Compute the dot product and throw the result away. We are timing the arithmetic, not using it.',
        14: 'Clock reading now, minus the reading from before: how long the scan took.',
        15: 'Print the measured time for 2,000 documents.',
        16: '10,000,000 divided by 2,000 is 5,000, so multiply the measured time by 5,000 to get the time for the full library, then divide by 60 to read it in minutes.',
      },
    },
    {
      type: 'intuition',
      title: 'What that number means, and the word for the fix',
      md: `Four minutes per query, for one user. Pure Python is slow, and real systems use optimised numeric code that is roughly a hundred times faster — call it **two to three seconds** per query. That is still far too slow for a search box, and it is per query: a hundred users at once means a hundred times the work.

- The problem is the shape of the cost, not the language. Doubling the library doubles the time. Ten million documents cost ten million comparisons. That relationship never improves.
- The fix is to build a data structure, in advance, that lets a query rule out most of the collection without scoring it. Such a structure is called an **index**. A phone book is an index: sorted by surname, so you never read the whole book.
- A database whose job is storing vectors and answering nearest-neighbour queries against them with such an index is a **vector database**.
- Here is the catch, and it is the point of this module. For vectors of a few hundred numbers, nobody knows how to build an index that is both much faster than the scan and guaranteed correct. You get to pick one.
- So real indexes give up the guarantee. **Approximate nearest neighbour search**, usually written **ANN**, returns *most* of the true nearest neighbours, most of the time, in a small fraction of the time.
- The measure of how much it returns is **recall**. Ask for the top 10; if 9 of the 10 the brute-force scan would have returned are in your answer, the **recall@10** for that query is 9/10 = 0.9. Averaged over many queries, that is the number a vector database is judged by.

Two ideas dominate the field. Both are simple enough to build in a dozen lines, and we will build both.`,
    },
    {
      type: 'intuition',
      title: 'Idea 1: IVF — sort the documents into buckets, search a few buckets',
      md: `The plain-words version, before any code. Imagine a library where books are shelved by topic. Someone asks for a book about money. You do not read every shelf; you walk to the money shelf and read only that one.

- Before any query arrives, pick a set of **centroids** — a handful of vectors spread through the collection, each meant to sit in the middle of a group of similar documents. Clustering algorithms produce these; k-means is the usual one, and you have seen it in the ML subject.
- Assign every document to the centroid it is closest to. Each centroid now owns a **bucket** of documents. This is done once, when the index is built, not per query.
- When a query arrives, compare it against the centroids only — there are a few thousand of them, not ten million. Find the closest centroid, and scan only that bucket.
- This design is called **IVF**, short for inverted file index. The number of buckets you scan is a knob called **nprobe**: nprobe=1 scans the single nearest bucket, nprobe=8 scans the eight nearest.
- The arithmetic, on the real numbers: 10,000,000 documents split into 4,096 buckets averages about 2,441 documents per bucket. With nprobe=8 you score 4,096 centroids plus 8 x 2,441 = 19,528 documents — about 23,600 comparisons instead of 10,000,000. That is **424 times less work**.
- And here is what it costs you. A document sitting near the edge between two buckets can be a genuine nearest neighbour of the query while living in a bucket you did not open. You will never see it, and nothing warns you.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'IVF on the six documents, and the neighbour it loses',
      code: `centroids = [[0.85, 0.15, 0.25], [0.10, 0.50, 0.50]]
buckets = [[], []]
for i in range(len(docs)):
    c = 0 if cosine(vecs[i], centroids[0]) > cosine(vecs[i], centroids[1]) else 1
    buckets[c].append(i)
print(buckets)

best_c = 0 if cosine(query, centroids[0]) > cosine(query, centroids[1]) else 1
print('searching bucket', best_c, 'only')
for i in buckets[best_c]:
    print(docs[i], round(cosine(vecs[i], query), 4))

# ---- real output ----
# [[0, 3], [1, 2, 4, 5]]
# searching bucket 0 only
# refund 0.9978
# payment 0.9688`,
      annotations: {
        1: 'Two centroids, chosen by hand here to keep it readable. The first points at money, the second sits between delivery and accounts. In a real index these come out of a clustering run over the documents.',
        2: 'A list holding two empty lists — one bucket per centroid. They will fill with document positions.',
        3: 'Walk every document once. This is the build step, and it happens before any query exists.',
        4: 'Compare this document to both centroids and pick the closer one. "0 if test else 1" is Python\'s conditional expression: it evaluates the test and the whole line becomes 0 when the test is true, 1 when it is false.',
        5: 'Put this document\'s position number into the winning bucket.',
        6: 'Print the finished index. [[0, 3], [1, 2, 4, 5]] means bucket 0 holds documents 0 and 3 — refund and payment — and bucket 1 holds the other four.',
        8: 'Now a query arrives. Same comparison, but for the query vector: which centroid is it closest to? Two comparisons, not six.',
        9: 'Announce the choice so the output is readable.',
        10: 'Loop over only the positions in the chosen bucket. The four documents in the other bucket are never touched — that is the entire saving.',
        11: 'Score and print each document we did look at. The result is refund then payment: correct, and found by scoring 2 documents plus 2 centroids instead of 6 documents.',
      },
    },
    {
      type: 'note',
      md: `Now compare against the yardstick. The exact ranking was **refund, payment, password**. IVF with nprobe=1 returned **refund, payment** and stopped, because \`password\` lives in bucket 1 and bucket 1 was never opened. If the user asked for the top 3, the true top 3 contains 3 documents and we found 2 of them, so **recall@3 = 2/3 = 0.667**. Nothing crashed, no warning appeared, and the two results we did return are perfectly good. That is exactly why this failure mode is easy to miss. Raise nprobe to 2 and both buckets get scanned: recall@3 goes to 1.0 and the work doubles. That single trade — turn nprobe up for accuracy, down for speed — is the whole tuning story for IVF.`,
    },
    {
      type: 'visual',
      component: 'KMeansStepper',
      props: { k: 4 },
    },
    {
      type: 'note',
      md: `That is the clustering step of IVF, running. Each coloured group becomes one bucket, and the marker at the centre of each group is its centroid. Step it and watch the centroids settle. Two things to notice for retrieval: the points near where two colours meet are the ones a nprobe=1 search will lose, and the buckets do not come out the same size — a lopsided cluster means one unlucky bucket is slow to scan.`,
    },
    {
      type: 'intuition',
      title: 'Idea 2: HNSW — a graph with express lanes',
      md: `The other dominant index does not cut the collection into pieces at all. It joins the documents up into a network and walks it.

- Build a **graph**: every document is a node, and each node is joined to a few of its nearest neighbours by edges. Then search by **greedy walking** — stand on a node, look at the nodes it is joined to, step to whichever is closest to the query, and repeat until no neighbour is closer than where you stand.
- On one flat graph that works, but slowly, because each step is small. From a random starting point on the far side of a ten-million-node graph, you take a great many small steps to arrive.
- So build **several layers of the same graph**. The bottom layer contains every document, densely joined, so steps there are fine and precise. Each layer above holds a random small sample of the layer below — perhaps one node in sixteen — joined to *its* nearest neighbours. Because the top layer is sparse, its edges span huge distances. One step up there covers ground that would take a hundred steps at the bottom.
- Search runs top-down. Greedy-walk the sparse top layer until you cannot improve, then drop to the layer below and continue from where you landed, then the layer below that, until you finish on the bottom layer. Big jumps first, fine steps last.
- This is **HNSW**: hierarchical navigable small world. The reason it is fast is that each layer roughly divides the remaining distance, so the number of steps grows like the *logarithm* of the collection size, not like the size. Ten times more documents costs a few more steps, not ten times more.
- What it costs: greedy walking can stop at a node that is better than all its neighbours but is not the true nearest — a dead end from which every direction looks worse. The knob that fixes this is called **efSearch**: instead of tracking one current node, track the best efSearch candidates at once, so a dead end is not fatal because other candidates are still live. Larger efSearch means higher recall and more work.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 1: the greedy walk itself',
      code: `def greedy(graph, start, query):
    node = start
    while True:
        best = node
        for n in graph[node]:
            if cosine(vecs[n], query) > cosine(vecs[best], query):
                best = n
        if best == node:
            return node
        node = best`,
      annotations: {
        1: 'graph says which nodes are joined to which, start is the node we begin standing on, query is the vector we are hunting for.',
        2: 'Remember where we are standing right now.',
        3: 'while True loops forever until something inside returns. We do not know in advance how many steps the walk needs.',
        4: 'Assume for now that where we stand is the best we have seen.',
        5: 'graph[node] looks up this node\'s neighbour list in the dict — the nodes we are allowed to step to from here.',
        6: 'Score each neighbour against the query and compare it with the best score so far. Higher cosine means closer.',
        7: 'Found a better neighbour, so it becomes the new best candidate.',
        8: 'After checking every neighbour: if the best one is still where we stand, no direction improves anything.',
        9: 'So the walk is finished. Hand back this node.',
        10: 'Otherwise take the step, and the while loop runs again from the new position.',
      },
    },
    {
      type: 'code',
      lang: 'python',
      title: 'Part 2: two layers, walked one after the other',
      code: `top = {2: [4, 3], 4: [2, 3], 3: [2, 4]}
bottom = {0: [3, 1], 1: [0, 4], 2: [0, 5], 3: [0, 4], 4: [1, 3], 5: [2]}

entry = greedy(top, 2, query)
print('layer 1 stopped at', docs[entry])
final = greedy(bottom, entry, query)
print('layer 0 stopped at', docs[final])

# ---- real output ----
# layer 1 stopped at payment
# layer 0 stopped at refund`,
      annotations: {
        1: 'The sparse upper layer. A dict: the key is a node, the value is its list of neighbours. Only three of the six documents appear here — 2 (password), 4 (delivery), 3 (payment) — and they are all joined to each other, so any one step can cross the whole collection.',
        2: 'The dense bottom layer. All six documents appear, and each is joined to two genuinely similar ones. Steps here are small and precise.',
        4: 'Start the search at node 2 (password) in the top layer. In a real HNSW index the entry point is fixed when the index is built; here it is deliberately a poor starting guess, to show the walk fixing it.',
        5: 'Print where the top-layer walk finished. From password it stepped to payment, because among the three top-layer nodes payment is by far the closest to a money query.',
        6: 'Drop to the bottom layer and keep walking from exactly where layer 1 left off. That handover is the whole trick: the coarse layer supplies a good starting point so the fine layer has almost no work left.',
        7: 'Print the final answer: refund, which is the true nearest neighbour. Trace it yourself — from payment (node 3) the neighbours are 0 and 4; node 0 scores 0.9978 so we step there; node 0\'s neighbours are 3 and 1, both worse, so the walk stops.',
      },
    },
    {
      type: 'note',
      md: `With six documents the saving looks silly — we scored about as many nodes as a full scan. The shape is what matters. Give the bottom layer ten million nodes and the walk still visits a few hundred, because each layer above cuts the distance rather than shaving a constant off it. In practice HNSW gives higher recall than IVF at the same speed and is the usual default; IVF wins when memory is tight, because HNSW must store every node's neighbour lists and that can cost more memory than the vectors themselves.`,
    },
    {
      type: 'intuition',
      title: 'What recall@10 = 0.95 actually means for the person searching',
      md: `Every ANN index is sold with a recall number, and it is easy to nod at "0.95" without asking what a user experiences. So spell it out. Recall@10 of 0.95 means: **average over many queries, 9.5 of the 10 documents the exact scan would have returned are in what you returned.** In practice, for a single query, you got 9 or 10 of them.

- The missing one is almost never the top result. The nearest neighbour is nearest by a margin and every method finds it; what gets lost is a document sitting at position 8 or 9, roughly as good as the ones at 10 and 11 that took its place.
- So for a search box, a user usually cannot tell. They wanted a good answer near the top, and they got one.
- For a question-answering system that feeds the retrieved documents to a language model, the same 0.95 can matter much more, because the one missing document may be the only one containing the actual answer. When the answer lives in exactly one document, missing it means a wrong reply, not a slightly worse list.
- The honest way to pick is to measure. Take a few hundred real queries, compute the exact answer once with a brute-force scan, then re-run them through the index at several settings of nprobe or efSearch and see what recall each setting buys and what it costs in milliseconds.
- The relationship is reliably lopsided. Going from recall 0.80 to 0.95 is usually cheap; going from 0.95 to 0.99 often costs several times more work than the whole jump before it. That is why 0.95 is the number everybody quotes — it is where the curve bends.`,
    },
    {
      type: 'intuition',
      title: 'Metadata filtering, and why it fights the index',
      md: `Real queries are rarely just "find similar text". They are "find similar text **written in the last 30 days, in English, that this user is allowed to see**". Those extra conditions are called **metadata filters**: ordinary field conditions on data stored alongside each vector.

- The awkwardness is that the ANN index was built from vectors alone. It knows nothing about dates or languages, so it cannot avoid returning documents the filter will throw away.
- **Filter afterwards.** Ask the index for the top 10, then drop the ones failing the filter. Fast, and fine when the filter keeps most documents. But if the filter keeps 1 in 1,000, the top 10 will almost certainly contain zero survivors and you return an empty page.
- **Filter first, then scan.** Find every document passing the filter, then brute-force scan just those. Exactly correct, and fine when the filter is very restrictive — 5,000 survivors is a quick scan. Useless when the filter keeps millions.
- **Filter during the search.** Real vector databases do this: walk the HNSW graph or the IVF buckets as usual, but skip non-matching documents when collecting results. It works, and it silently gets slower and less accurate as the filter gets stricter, because the walk keeps stepping through nodes it is not allowed to keep, and the graph's edges may not lead anywhere useful among the survivors.
- The practical rule: a filter that keeps most documents is free, a filter that keeps almost none should be a plain scan, and the middle is where you must measure rather than assume. If one filter value dominates your traffic — one tenant, one language — the usual fix is to build that subset its own index, so no filtering is needed at query time.`,
    },
    {
      type: 'intuition',
      title: 'Worked case: sizing an index by hand',
      md: `A support team has **2,000,000 documents**, vectors of **384 numbers** each stored as 4-byte floats. They want the top 10 results in under 50 milliseconds. Work it out on paper before touching a library.

- **Memory for the raw vectors.** 384 numbers x 4 bytes = 1,536 bytes per document. Times 2,000,000 = 3,072,000,000 bytes, which is about **3.07 GB**. It fits in RAM on one ordinary machine, so no sharding across machines is needed.
- **Cost of the exact scan.** 2,000,000 x 384 = 768,000,000 multiply-and-adds per query. Optimised numeric code does very roughly a billion of those per second per core, so about **0.77 seconds** on one core. The target is 0.05 seconds, so brute force misses by more than fifteen times. An index is required — this is the arithmetic that proves it, and it is the arithmetic to do first.
- **Sizing IVF.** A common starting rule is about the square root of the document count for the number of buckets: the square root of 2,000,000 is about 1,414, so round to 1,024 or 2,048. Take 2,048 buckets, averaging 977 documents each.
- **Cost with nprobe=16.** Score 2,048 centroids, then 16 x 977 = 15,632 documents: 17,680 comparisons versus 2,000,000. That is **113 times less work**, so roughly 6.8 milliseconds. Comfortably inside 50, with room for the filter and the network.
- **The recall check that must follow.** Take 300 real queries. Compute the exact top 10 for each with a brute-force scan — slow, but done once, offline. Run the same 300 through the index at nprobe = 4, 8, 16, 32 and count overlaps. Suppose nprobe=16 averages 9.4 of the 10 exact results: recall@10 = **0.94**.
- **Reading the result.** If this feeds a human-facing search box, 0.94 at 6.8 ms is a good deal — ship it. If it feeds a language model that must answer from one specific document, try nprobe=32: if that gives 0.97 at 13 ms, it is still inside budget and worth the extra work.

Notice the order. Compute the memory, prove the scan is too slow, size the index from the document count, then measure recall against the exact answer. Nothing here needed a library, and every number came from the two facts at the top: two million documents, 384 dimensions.`,
    },
    {
      type: 'intuition',
      title: 'The classic mistake, walked into on purpose',
      md: `A team builds document search over 5,000,000 documents with HNSW at default settings. It works well. Six months later someone asks a different question: *"give me every document about the 2023 refund policy, we have to review them all"*. They run it as a search with k set to 500 and take the result as the complete list.

- The review is done. Two months later an auditor finds refund-policy documents that were never reviewed. They were in the index. They were never returned.
- The diagnosis: **an ANN index does not return the true nearest neighbours, and the team treated its output as if it did.** Their index measures at recall@500 of about 0.93. So of the roughly 500 documents that a brute-force scan would have ranked highest, about 35 were missing from the answer. There was no error and no warning — a short list is exactly what a search index is supposed to return.
- Why the everyday search box never exposed this: a user looks at the top few results, and the top few are almost always right. Recall is lost in the tail. The moment you use the tail as an answer instead of a suggestion, the missing 7% becomes the whole problem.
- The second thing that went wrong is the shape of the question. "Every document about the 2023 refund policy" has a definite, checkable answer. Similarity search has no answer at all — it has a ranking, and it never says "and that is all of them". No value of k turns a ranking into a complete set.
- The fix is to use the right tool for the question. Completeness comes from an exact scan over a filtered subset: filter by date and category with ordinary database conditions, then brute-force scan the survivors. If that is 40,000 documents, the scan takes under a second and is guaranteed correct. Slower, and right.

The general rule to carry away: **use ANN when a good answer near the top is enough, and an exact scan when missing something is a real cost.** Approximate is a promise about the top of a ranking. It is never a promise about a set.`,
    },
    {
      type: 'note',
      md: `A second mistake worth naming, because it produces no error either. Someone re-embeds half the library with a newer, better embedding model and leaves the other half alone. Cosine similarity happily compares a vector from model A with a vector from model B and returns an ordinary-looking number — using our numbers, a query at [0.85, 0.05, 0.15] against a differently-produced [0.2, 0.9, 0.1] scores about **0.287**. Nothing is out of range, nothing crashes, and the ranking is meaningless, because two models put the same meaning in completely different directions. **One index, one embedding model, one version of it.** Changing the model means re-embedding every document, and it means re-embedding queries with the same model too.`,
    },
    {
      type: 'intuition',
      title: 'Practice problems',
      md: `Pen and paper. The arithmetic is deliberately small.

1. A library has 4,000,000 documents with 512-number vectors. How many multiply-and-add operations does one exact scan cost? If a machine does 1,000,000,000 of them per second, how long is one query?
2. The same library is indexed with IVF using 2,000 buckets and nprobe=10. About how many document comparisons does one query cost now, including the centroid comparisons, and how many times less work is that?
3. A query's true top 5 are documents A, B, C, D, E. The index returns B, A, F, C, G. What is recall@5? Would a user of a search box notice?
4. You have vectors from two embedding models mixed in one index. Cosine similarity still returns numbers between -1 and 1 and nothing errors. Explain in two sentences why the results are still wrong.
5. A query must be filtered to one customer's documents, and the average customer owns 800 of the 3,000,000 documents. Which of the three filtering strategies fits, and why do the other two fail?`,
    },
    {
      type: 'intuition',
      title: 'Worked solutions',
      md: `Check every step, not only the final number.

1. Each comparison is 512 multiply-and-adds, and there are 4,000,000 of them: 4,000,000 x 512 = **2,048,000,000** operations. At a billion per second that is **about 2.05 seconds** per query — far too slow for a search box, which is what proves an index is needed.
2. 4,000,000 documents in 2,000 buckets averages 2,000 documents per bucket. nprobe=10 scans 10 x 2,000 = 20,000 documents, plus 2,000 centroid comparisons, giving **22,000** comparisons. 4,000,000 / 22,000 = **about 182 times less work**, so roughly 11 milliseconds instead of 2.05 seconds.
3. Of the true top 5 (A, B, C, D, E), the returned list contains A, B and C — three of them. **recall@5 = 3/5 = 0.6.** A search-box user probably would not notice, because A and B, the two best results, are both present and near the top. A system that needs a specific fact from D or E gets a wrong answer and never learns why. Note also that 0.6 is poor for an ANN index; recall this low usually means nprobe or efSearch is set too low.
4. Two embedding models are trained separately, so each invents its own directions in the vector space — model A might put "money" along position 1 while model B spreads it across several positions. A cosine between vectors from the two spaces is therefore comparing coordinates that mean different things, and the score it returns is arithmetic performed on unrelated numbers, which is why it looks reasonable and ranks nothing correctly.
5. 800 out of 3,000,000 keeps about 1 document in 3,750, so **filter first, then brute-force scan the survivors**. 800 comparisons is instant. Filtering afterwards fails because the unfiltered top 10 would essentially never contain that customer's documents, returning an empty page. Filtering during the search technically works, but the graph walk would spend nearly all its steps on documents it must discard, making it slower than the 800-document scan and less accurate too. Better still, give each customer their own small index.`,
    },
    {
      type: 'intuition',
      title: 'Beyond the basics - skip this on your first read',
      md: `Everything above stands alone. This section names ideas you will meet later so the words are not new when you do.

- **Quantization.** Storing each number as a 4-byte float is expensive: our six-document toy used 12 bytes per document, but 10,000,000 documents at 768 numbers costs 30 GB. Product quantization replaces each vector with a short code, cutting memory by 10 to 30 times at the cost of approximate distances. It is how billion-vector indexes fit on one machine, and it lowers recall further, on top of whatever the index already lost.
- **Hybrid search.** Semantic search fails on exact tokens — a part number, a person's surname, an error code — because those carry little meaning to an embedding model. Keyword search handles them perfectly. Running both and combining the two rankings is called hybrid search, and it is usually the single largest quality improvement available after the index works at all.
- **Reranking.** Retrieval returns 50 candidates fast and roughly; a slower, more accurate model then re-scores just those 50 and reorders them. Cheap, because it only ever sees 50 documents. This belongs to the retrieval pipeline and is covered in *RAG End to End: Retrieve, Rerank, Generate*.
- **Chunking.** Long documents must be cut into pieces before embedding, because one vector cannot represent twenty pages. How to cut them is a genuinely consequential decision with its own trade-offs, and it is taught in *RAG End to End: Retrieve, Rerank, Generate*, not here.
- **Updates and deletes.** Adding a vector to an HNSW graph is straightforward. Deleting one is not, because other nodes' neighbour lists point at it; implementations usually mark it deleted and rebuild the index periodically. If your data changes constantly, ask how the index handles that before you choose it.`,
    },
  ],
  quiz: [
    {
      question: 'A library has 10,000,000 documents with 768-number vectors. Why is a brute-force scan a problem, even though it is guaranteed correct?',
      options: [
        {
          text: 'It costs 10,000,000 x 768 = about 7.68 billion multiply-and-adds for one query, and that cost grows in direct proportion to the library size',
          explanation: 'Correct. The cost is proportional to the number of documents, so it can never be made acceptable by tuning — only by not looking at every document.',
        },
        { text: 'Cosine similarity is inaccurate at high dimensions, so the ranking would be wrong', explanation: 'The scan\'s ranking is exact by construction — it is the yardstick everything else is measured against. Speed is the only problem.' },
        { text: 'Storing 10,000,000 vectors is impossible on one machine', explanation: '768 numbers at 4 bytes each is about 3 KB per document, so 10,000,000 documents is roughly 30 GB. Large, but not impossible, and not why the scan is slow.' },
      ],
      correct: 0,
    },
    {
      question: 'In the six-document example, IVF with nprobe=1 returned refund and payment but not password, which the exact scan ranked third. What happened?',
      options: [
        { text: 'password\'s vector was corrupted when the index was built', explanation: 'Nothing was corrupted. password was scored normally during the build and placed in bucket 1; the query simply never opened that bucket.' },
        {
          text: 'password was assigned to the other bucket, and nprobe=1 opened only the single nearest bucket, so it was never scored against the query',
          explanation: 'Correct, and note that nothing failed loudly. A genuine neighbour sitting in an unopened bucket is invisible, which is why recall must be measured rather than assumed.',
        },
        { text: 'Its cosine score of 0.281 was below a similarity threshold', explanation: 'There is no threshold anywhere in the code. The only filter applied was which bucket was scanned.' },
      ],
      correct: 1,
    },
    {
      question: 'What does recall@10 = 0.95 mean?',
      options: [
        { text: '95% of the documents returned are relevant to the user', explanation: 'That describes precision against human judgements of relevance. Recall here compares against the exact scan\'s output, which may itself contain irrelevant documents.' },
        { text: 'The system answers within 95% of the target latency', explanation: 'Recall says nothing about time. It is purely a comparison of two lists of documents.' },
        {
          text: 'Averaged over many queries, 9.5 of the 10 documents a brute-force scan would have returned are present in the index\'s answer',
          explanation: 'Correct. The exact scan is the reference, and recall counts the overlap between the approximate answer and that reference.',
        },
      ],
      correct: 2,
    },
    {
      question: 'Why does HNSW use several layers instead of one large graph?',
      options: [
        {
          text: 'Upper layers hold a sparse sample, so their edges span long distances and cover ground quickly; the search takes big jumps first and fine steps last',
          explanation: 'Correct. Each layer roughly divides the remaining distance, which makes the number of steps grow like the logarithm of the collection size rather than its size.',
        },
        { text: 'Each layer stores a different embedding model, so the layers can be compared', explanation: 'Every layer holds the same vectors from the same model. Mixing models in one index is a bug, not a design.' },
        { text: 'Layers split the vectors across machines so no machine holds them all', explanation: 'That is sharding, a separate concern. HNSW layers are all part of one index and the bottom layer already contains every document.' },
      ],
      correct: 0,
    },
    {
      question: 'A filter keeps about 1 document in 3,750. Which strategy fits?',
      options: [
        { text: 'Ask the ANN index for the top 10, then discard the ones failing the filter', explanation: 'The unfiltered top 10 would almost never contain a survivor at that ratio, so the user gets an empty page.' },
        {
          text: 'Find every document passing the filter first, then brute-force scan those',
          explanation: 'Correct. The survivors are few, so an exact scan over them is both fast and guaranteed correct — the ANN index is not needed at all.',
        },
        { text: 'Rebuild the index with a larger nprobe so the filter has more candidates', explanation: 'Raising nprobe increases work everywhere for every query and still gives no guarantee the survivors are reached. It treats the symptom.' },
      ],
      correct: 1,
    },
    {
      question: 'A team uses an ANN search with k=500 to produce a complete list of documents on a topic for a compliance review. What is wrong?',
      options: [
        { text: 'k=500 is too small; k=5,000 would return the complete set', explanation: 'No value of k makes a ranking complete. A larger k returns more documents and still offers no guarantee that none were skipped.' },
        {
          text: 'ANN returns most of the top-ranked documents, not all of them, so at recall@500 of 0.93 roughly 35 genuine matches are silently absent',
          explanation: 'Correct. Completeness needs an exact scan over a filtered subset. Similarity search produces a ranking, and a ranking never says "and that is all of them".',
        },
        { text: 'Cosine similarity is the wrong measure for compliance topics', explanation: 'The similarity measure is not the issue. The issue is treating an approximate ranking as an exhaustive set.' },
      ],
      correct: 1,
    },
  ],
  interviewQuestions: [
    {
      question: 'Why can you not just compare a query vector against every document vector?',
      answer:
        'You can, and it is exactly correct — it is the yardstick everything else is measured against. The problem is that the cost grows in direct proportion to the collection. Ten million documents with 768-number vectors is 7.68 billion multiply-and-adds for a single query. Optimised numeric code gets that to roughly two or three seconds on a core, which is far outside a search box\'s budget, and it is per query, so concurrent users multiply it. Nothing about that improves with tuning; the only fix is to avoid scoring most of the collection, which means building an index in advance. And since no index for high-dimensional vectors is both much faster and guaranteed correct, the index you build is approximate, and you accept a measured loss of recall in exchange.',
      isCaseBased: false,
    },
    {
      question: 'Explain HNSW to someone who has not seen it.',
      answer:
        'Join every document to a few of its nearest neighbours so the collection becomes a graph. To search, stand on some node, look at the neighbours it is joined to, step to whichever is closest to the query, and repeat until no neighbour is better. On one flat graph that works but each step is small, so arriving takes many steps. So build layers: the bottom layer has every document, densely joined; each layer above holds a random sample of the one below, perhaps one node in sixteen, joined to its own nearest neighbours. Because upper layers are sparse, their edges span long distances. Search runs top-down — walk the sparse layer for big jumps, drop a layer, continue from where you landed, finish precisely at the bottom. Each layer roughly divides the remaining distance, so steps grow like the logarithm of the collection size. The failure mode is a greedy walk stopping at a node better than all its neighbours but not the true nearest, and efSearch fixes it by tracking several candidates at once.',
      isCaseBased: false,
    },
    {
      question: 'Explain IVF, and say honestly what it gets wrong.',
      answer:
        'Before any query arrives, cluster the vectors and pick a centroid per cluster; assign every document to its nearest centroid so each centroid owns a bucket. At query time, compare the query against the centroids only — a few thousand comparisons — then scan the nearest few buckets. The number scanned is nprobe. On real numbers: ten million documents in 4,096 buckets averages 2,441 per bucket, so nprobe=8 costs about 23,600 comparisons instead of ten million, roughly 424 times less work. What it gets wrong is boundary cases. A document sitting near the edge between two buckets can be a genuine nearest neighbour while living in a bucket you did not open, and it is silently absent — nothing errors, and the results you did return look fine. Raising nprobe opens more buckets and recovers those neighbours, at proportionally more work. Compared with HNSW, IVF usually gives lower recall at the same speed but uses much less memory, because it stores no neighbour lists.',
      isCaseBased: false,
    },
    {
      question: 'Case: your search team must serve top-10 results over 2,000,000 documents with 384-dimension vectors in under 50 ms. Size it.',
      answer:
        'Memory first: 384 numbers at 4 bytes is 1,536 bytes per document, times 2,000,000 is about 3.07 GB — one machine, no sharding. Then prove an index is needed: an exact scan is 2,000,000 x 384 = 768 million multiply-and-adds, roughly 0.77 seconds on one core at a billion operations per second, which misses the 50 ms budget by more than fifteen times. Size IVF from the document count using the square-root rule: the square root of two million is about 1,414, so take 2,048 buckets averaging 977 documents each. With nprobe=16 that is 2,048 centroid comparisons plus 15,632 document comparisons, about 17,680 in total, roughly 113 times less work, so around 6.8 ms — comfortably inside budget with room for filtering and network time. Then measure rather than assume: take 300 real queries, compute their exact top 10 once offline with a brute-force scan, and re-run them at nprobe = 4, 8, 16, 32. If nprobe=16 gives recall@10 of 0.94 for a human-facing search box, ship it. If the results feed a language model that must answer from one specific document, check whether nprobe=32 buys 0.97 at 13 ms, which is still inside budget.',
      isCaseBased: true,
    },
    {
      question: 'Case: a compliance team used your ANN search with k=500 to build "every document about the 2023 refund policy". An auditor found documents that were never reviewed. Diagnose it.',
      answer:
        'The index did what it is designed to do; the question asked of it was the wrong shape. ANN returns most of the top-ranked documents, not all of them. If the index measures recall@500 of about 0.93, then roughly 35 of the 500 documents an exact scan would have ranked highest are absent from the answer, with no error and no warning. The everyday search box never revealed this because recall is lost in the tail and users only look at the top few results — the moment the tail becomes the answer, the missing 7% becomes the whole problem. There is also a deeper mismatch: "every document about X" has a definite, checkable answer, while similarity search produces a ranking and never claims to be exhaustive. No value of k converts a ranking into a complete set. The fix is to answer it as a filter plus an exact scan: select by date and category with ordinary database conditions, then brute-force scan the survivors. Forty thousand documents scan in under a second and the result is guaranteed. The rule going forward is that ANN serves questions where a good answer near the top is enough, and exact scans serve questions where a miss has a real cost.',
      isCaseBased: true,
    },
    {
      question: 'Case: retrieval quality collapsed on one customer\'s tenant after you shipped a new embedding model. What do you check first?',
      answer:
        'First hypothesis: the library is now a mixture of two embedding spaces. Rolling out a new model usually means re-embedding, and if the job was partial — one tenant missed, a backfill that timed out, new documents written by the new model while old ones kept the old vectors — then some documents live in the old space and some in the new. Cosine similarity between vectors from two separately-trained models still returns an ordinary number in range, because the arithmetic works fine on unrelated coordinates; on our toy numbers a query at [0.85, 0.05, 0.15] against a differently-produced [0.2, 0.9, 0.1] scores about 0.287. Nothing errors, and the ranking is meaningless. Check it by stamping every vector with the model name and version at write time and counting the distinct values per tenant, which turns an invisible bug into a one-line query. Second hypothesis if the space is uniform: the index was rebuilt with different parameters during the migration, so measure recall against a brute-force scan on that tenant. Third: the new model changed the vector dimension and something silently truncated or padded. The general rule is one index, one model, one version, and re-embedding queries with the same model that embedded the documents.',
      isCaseBased: true,
    },
    {
      question: 'How does metadata filtering interact with an ANN index?',
      answer:
        'Awkwardly, because the index was built from vectors alone and knows nothing about dates, languages or ownership. Three strategies exist. Filter afterwards: take the index\'s top 10 and drop the failures — fast, and fine when the filter keeps most documents, but if it keeps 1 in 1,000 the top 10 contains no survivors and the user gets an empty page. Filter first: find every document passing the filter and brute-force scan those — exactly correct and fast when the filter is very restrictive, useless when millions survive. Filter during the search: real vector databases walk the graph or the buckets as usual but skip non-matching documents, which works and degrades quietly as the filter tightens, because the walk keeps stepping through nodes it cannot keep and the edges may not lead anywhere useful among the survivors. The rule: permissive filters are free, very restrictive filters should be a plain scan, and the middle must be measured. If one filter value dominates traffic, such as a single large tenant, give it its own index and filter nothing at query time.',
      isCaseBased: false,
    },
    {
      question: 'How would you choose between recall 0.90 and recall 0.99 for a system?',
      answer:
        'By what a miss costs, not by preference for a bigger number. The relationship between recall and work is lopsided: moving from 0.80 to 0.95 is usually cheap, and moving from 0.95 to 0.99 often costs several times more work than that whole earlier jump, which is why 0.95 is the number everyone quotes — it is where the curve bends. For a human-facing search box, the lost documents sit at positions 8 and 9 and are roughly as good as the ones that replaced them, so a user cannot tell and 0.90 is fine. For a system that feeds retrieved documents to a language model, the missing document may be the only one containing the answer, and then the miss is a wrong reply rather than a slightly worse list, so paying for 0.99 is justified. Either way, measure it: compute exact answers for a few hundred real queries once offline, then sweep nprobe or efSearch and plot recall against latency. That plot, not a rule of thumb, decides it.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Why an index is needed at all', back: '10,000,000 documents x 768 numbers = 7.68 billion multiply-and-adds per query for an exact scan, and the cost grows in direct proportion to the collection. An index exists to avoid scoring most of it.' },
    { front: 'Exact vs approximate (ANN) search', back: 'Exact = compare against everything, guaranteed correct, too slow. ANN = use an index that skips most of the collection, returns most of the true nearest neighbours, and never says which ones it missed.' },
    { front: 'Recall@10', back: 'Averaged over many queries, how many of the 10 documents a brute-force scan would return are present in the index\'s answer. 0.95 means 9.5 of 10. The exact scan is always the reference.' },
    { front: 'IVF in one line', back: 'Cluster the vectors into buckets around centroids, then compare the query to the centroids only and scan the nearest nprobe buckets. 10M docs, 4,096 buckets, nprobe=8: about 23,600 comparisons instead of 10M.' },
    { front: 'What IVF gets wrong', back: 'A document near the edge between two buckets can be a genuine nearest neighbour in a bucket you never opened. Silently missing. Raising nprobe recovers it at proportionally more work.' },
    { front: 'HNSW in one line', back: 'A layered graph: sparse at the top so edges span long distances, dense at the bottom for fine steps. Greedy-walk each layer, hand the landing point down. Steps grow like the log of the collection size.' },
    { front: 'Metadata filtering, three strategies', back: 'Filter after (fast, empties out under strict filters), filter first then exact scan (correct, only for very restrictive filters), filter during the walk (what real vector DBs do, degrades quietly as the filter tightens).' },
    { front: 'One index, one model', back: 'Cosine between vectors from two different embedding models returns a normal-looking number and ranks nothing correctly. Changing the model means re-embedding every document and every query.' },
  ],
  mindmapMarkdown: `- Search at scale
  - The problem
    - 10,000,000 docs x 768 numbers
    - 7.68 billion operations per query
    - measured: minutes in pure Python
  - Brute-force / exact search
    - score every document, sort, take top k
    - always correct, cost grows with the collection
    - it is the yardstick for recall
  - Index
    - built in advance, lets a query skip most documents
    - a vector database = storage + index + filters
    - no index is both fast and guaranteed correct
  - ANN and recall
    - returns most of the true neighbours, not all
    - recall@10 = overlap with the exact top 10
    - 0.95 is where the cost curve bends
  - IVF
    - centroids, buckets, nprobe
    - 4,096 buckets, nprobe=8: 424x less work
    - loses neighbours near bucket boundaries
  - HNSW
    - graph of nearest-neighbour edges
    - greedy walk: step to the closest neighbour
    - sparse top layer jumps, dense bottom layer refines
    - efSearch = how many candidates tracked at once
  - Metadata filtering
    - filter after / filter first / filter during
    - restrictive filter = plain scan
    - dominant filter value = its own index
  - Classic mistakes
    - treating ANN output as a complete set
    - mixing two embedding models in one index
  - Taught elsewhere
    - what an embedding is: DL Embeddings: Meaning as Vectors
    - chunking and reranking: RAG End to End`,
}

export default m
