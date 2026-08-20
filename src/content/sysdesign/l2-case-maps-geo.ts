import type { Module } from '../types'

const m: Module = {
  id: 'sysdesign-l2-case-maps-geo',
  subjectId: 'sysdesign',
  level: 2,
  title: 'Case Study: Google Maps — Spatial Indexes in Depth, Routing & ETA',
  whyItMatters:
    'Every candidate can say "use geohashing". Almost nobody can say why an R-tree exists, why Google chose a Hilbert curve, or why Dijkstra on a road graph would touch most of a country. This module is the depth behind those one-liners, plus the half of Maps that is not a spatial index at all: routing is a graph problem, ETA is a machine-learning problem, and traffic is a control loop that changes the thing it measures. It also hands you the single most reusable idea in geo interviews — preprocessing buys speed and costs freshness — and the honest answer to "which index would you use", which is the question that actually gets asked.',
  estMinutes: 60,
  sections: [
    {
      type: 'intuition',
      title: 'Read the Uber case study first',
      md: `This module deliberately does not re-teach what you already have. Do *Case Studies: YouTube/Netflix & Uber* before this one.

- That module teaches **geohash**: interleaving longitude and latitude bits so nearby points share a string prefix, the boundary problem (points ten metres apart can share almost no prefix), and the **9-cell query** — centre cell plus its eight neighbours, then filter by true distance — with a runnable demo. All of that is assumed here.
- It also covers the in-memory location index, the matching flow, surge pricing, and the one write that needs strict correctness. Assumed too.
- **This module is the half that was skipped.** First, the index structures compared properly — quadtree, R-tree, S2 and H3 each got one line there; here they get the mechanics, the costs, and a selection rule.
- Then **routing**, which is a *different problem entirely*. A spatial index answers "what is near this point". Routing answers "how long does it take to get from here to there", and no spatial index can answer that — it is a graph search, and at country scale the textbook algorithm is unusable.
- Finally the things that hang off routing: **ETA** (a prediction problem, not a graph problem), **live traffic**, **map matching**, and **tile serving**.`,
    },
    {
      type: 'intuition',
      title: 'Requirements: what Maps owes the user',
      md: `*Try it first: write the functional and non-functional requirements before reading on. One of the non-functional lines decides the entire second half of this module — find it.*

**Functional**

- **Draw the map**: tiles at every zoom from whole-continent down to individual buildings, pannable and zoomable.
- **Search a place**: free text — "221B Baker Street", "coffee near me" — resolved to coordinates and ranked.
- **Route A→B** for a travel mode (drive, walk, cycle, transit), optionally departing at a future time.
- **Live traffic**, both drawn on the map and folded into the route's edge weights.
- **ETA** the user can plan around — a number, not a lower bound.
- **Reroute on deviation**: the driver misses a turn and a new route appears within a second or two, unasked.

**Non-functional**

- **A continent-scale route query in well under a second, end to end.** Subtract a network round trip and rendering and the router itself gets tens of milliseconds. That one line is what kills plain Dijkstra, and the routing sections below do the arithmetic that proves it.
- **Read-dominated.** Tiles, searches and routes are all reads. The only real writes are anonymized probe pings and map edits, and neither is on a user's request path.
- **Availability over freshness.** A route computed on traffic two minutes stale is fine; a spinner is not. This is affordable here because every layer has a strictly worse but *correct* fallback — live traffic falls back to historical profiles, the ETA model falls back to the routing baseline.
- **Global**, which means per-region data quality varies by an order of magnitude, and the design must degrade where the data is thin rather than pretend it is not.`,
    },
    {
      type: 'intuition',
      title: 'Estimation: routes are rare, tiles are constant, the graph must fit in RAM',
      md: `*Try it first: 1 billion daily active users. Work out route QPS, tile QPS, how big a continental road graph is, and how many tiles exist at zoom 20.*

- **Routes.** Say 20% of DAU ask for 2 routes a day: 1B × 0.2 × 2 = **400M routes/day** → 400M ÷ 86,400 ≈ **4,600 route QPS**, peak 3× ≈ **14K QPS**.
- **Tiles.** A 1080×2000 phone screen holds ~33 tiles at 256 px, and panning plus prefetch pushes a session past 60. 1B × 60 = **60B tiles/day** → ≈ **700K tiles/s**, peak ≈ 1.4M/s.
- That is **150× the route rate by count** — and it costs almost nothing, because at a 98% CDN hit rate the origin sees ~14K/s, the same order as the route load.
- **The ratio is the design.** The cheap request is 150× more common and perfectly cacheable; the expensive request is rare and barely cacheable. Spend engineering on routing and money on the CDN.
- **Road graph.** A continental network expanded for turn restrictions is on the order of **10⁸ directed edges**. At ~20 bytes per edge that is **2 GB**; add ~10⁷ nodes and the 30–100% extra edges that contraction hierarchies introduce and call it **3–4 GB**. That fits in RAM on one commodity machine — which is the whole reason routing servers look the way they do.
- **Why RAM and not disk, as a calculation rather than an opinion.** Graph search is pointer chasing with no locality: every settled node is a random access. RAM is ~100 ns, an SSD read ~100 µs — a **1,000× gap**. A contraction-hierarchy query settling ~10³ nodes costs ~0.1 ms in RAM and ~0.1 s on SSD; a plain Dijkstra settling 10⁷ nodes costs ~1 s in RAM and **~1,000 s** on SSD. A disk-backed road graph is not slow, it is impossible.

**Tile storage, and the doubling that is really a quadrupling.** Zoom z is a 2ᶻ × 2ᶻ grid, so **every zoom level holds four times as many tiles as the level above it.**

- z=0 is 1 tile; z=10 is 4¹⁰ ≈ **1.05 million**; z=15 is 4¹⁵ ≈ **1.07 billion**; z=20 is 4²⁰ ≈ **1.1 trillion**.
- Everything down to level z sums to (4ᶻ⁺¹ − 1)/3, so summed to z=20 that is **≈ 1.47 trillion** tiles — and 4²⁰ alone is **75% of it**. The storage question is entirely a question about the deepest one or two levels.
- Price the shallow half: everything up to **z=14** is (4¹⁵ − 1)/3 ≈ **358 million** tiles, at ~30 KB per vector tile ≈ **11 TB**. That is nothing. Pre-render all of it.
- Price one more octave: z=20 over the whole globe is 1.1 trillion × 30 KB ≈ **33 PB**, and 71% of that is ocean nobody will ever request. Clip to land and it is still ~10 PB.
- So the numbers force the rule: **pre-render down to roughly z=14, render deeper tiles on demand, and let the CDN retain the ones people actually ask for.** Tile popularity is Zipfian — a handful of cities carry most requests — so the on-demand renderer only ever sees genuine long-tail misses.`,
    },
    {
      type: 'intuition',
      title: 'API design: four endpoints, and only one is hard to cache',
      md: `*Try it first: write the smallest API that serves those requirements, then mark each endpoint cacheable or not — and for how long.*

- \`GET /v{map_version}/tiles/{z}/{x}/{y}.mvt?style=&lang=\` → one vector tile. **Cache one year, immutable.**
- \`GET /route?from=12.97,77.61&to=19.08,72.88&mode=drive&depart_at=\` → \`{ polyline, steps[], distance_m, duration_s, alternatives[] }\`. **Barely cacheable**, and the reason is below.
- \`GET /geocode?q=221B+Baker+Street&near=&lang=\` → ranked \`{ place_id, name, lat, lng, type }\`. **Cache minutes to hours** — query popularity is Zipfian, so a small cache covers a large share of traffic.
- \`GET /eta?from=&to=&depart_at=\` → \`{ duration_s, confidence }\`. **Cache seconds**, and only when the endpoints are bucketed to cell pairs rather than exact coordinates.
- **All GET, all idempotent.** A POST here would be self-harm: it makes every browser, proxy and CDN treat the response as uncacheable, and by request count this design is ~98% cache.

**Why tiles are the ideal CDN object** — and this is the part interviewers are listening for:

- The URL is derived **entirely from \`(version, z, x, y, style, lang)\`**. No user id, no auth, no personalisation, so one cached copy serves every person on Earth looking at that square.
- The content is **immutable for that map version**, so you never invalidate. A new map release is a **new version in the path**, and the old URLs simply stop being requested. Never invalidate a trillion objects; change the key.
- Access is **extremely local** — a small fraction of tiles carry the overwhelming majority of requests — so hit rates in the high nineties are normal.
- A route response fails all three: the origin-destination pair is near-unique, the answer depends on traffic that changed a minute ago, and it can depend on user preferences. The fix is to **split it by lifetime** — cache the path, recompute the number — which the serving section works through in full.`,
    },
    {
      type: 'intuition',
      title: 'Data model: four stores, and not one of them is a single database',
      md: `*Try it first: list every piece of data this system holds, pick a store for each, and justify the pick with the access pattern rather than with a product name.*

- **The road graph** — nodes (intersections), directed edges carrying geometry, road class and a **time weight per (time-of-day, day-of-week) bucket**, plus turn restrictions. Its modelling subtleties get their own section below; the storage answer is that it is **not in a database at all.** It is built offline into an immutable binary snapshot and loaded **wholly into the routing servers' RAM** (3–4 GB), because a query is 10³–10⁷ random accesses and the 100 ns versus 100 µs gap decides whether the product exists. A map release is a new snapshot and an atomic swap.
- **The tile store** — key \`(map_version, z, x, y, style, lang)\` → an immutable blob of a few tens of KB. Store: **object storage fronted by a CDN.** No queries, no indexes, no transactions — the key *is* the query, and 98% of reads never reach the origin.
- **The place / geocoding index** — \`place_id\` → names and alternate names, address components, category, coordinates, popularity. Store: an **inverted text index** (Lucene-shaped) with a spatial filter, because the access pattern is fuzzy multi-token text search ranked by relevance *and* proximity — the one thing a key-value store cannot do. The canonical place rows live in an ordinary replicated row store; the index is a derived, rebuildable copy of them.
- **Live traffic** — \`segment_id\` → current speed, contributing device count, updated_at, with a **TTL of a few minutes**. Store: an **in-memory key-value store**, sharded by region. It is pure cache: it is rewritten every minute from probe aggregation, so losing it costs one window and it refills itself. Below the minimum-device threshold the read falls through to the **historical speed profile**, a small static table shipped inside the graph snapshot.

**Notice what these four have in common.** Three are *derived and rebuildable* — graph snapshot, tiles and geocoding index are all outputs of offline pipelines over source map data — and the fourth is a cache. Almost nothing on the read path is authoritative state, which is precisely why "availability over freshness" was an affordable requirement rather than a brave one.`,
    },
    {
      type: 'intuition',
      title: 'Two questions, and they need different machinery',
      md: `Keep these apart in your head, because interviewers deliberately blur them.

- **"What is near this point?"** — a *proximity* question. Answered by folding two dimensions into one ordered key or one tree, so the answer is a small set of key lookups. This is the spatial index.
- **"How do I get from A to B, and how long will it take?"** — a *connectivity* question. Two points 50 metres apart across a motorway with no crossing are a 4 km drive. Proximity tells you nothing about it; only the road graph does.
- The mistake to avoid out loud: **straight-line distance is a filter, never an answer.** Use the spatial index to shrink a million candidates to fifty; use the graph to rank those fifty.
- One more distinction that decides your index choice: some objects are **points** (a driver, a phone, a pin) and some have **extent** (a road is a polyline, a building is a polygon, a lake is a huge polygon). Almost every index people name in interviews only handles points. Maps is mostly extents.`,
    },
    {
      type: 'intuition',
      title: 'Quadtree: the tree that gets deep where the data is dense',
      md: `*Attempt it: you have a square region and a stream of points. Design an index whose cells are small downtown and huge over the sea, without deciding cell size in advance.*

The mechanics, and they are short:

1. Start with one node covering the whole region, holding points in a list.
2. **Insert**: if the node is internal, work out which of its four quadrants the point falls in and descend. If it is a leaf, append the point.
3. **Split**: when a leaf holds more than **capacity** points (say 4), create four child nodes covering its four quadrants and re-insert its points into them. Internal nodes hold no points at all — they only route.
4. Note the recursion in step 3: if all the overflowing points land in the *same* child, that child immediately overflows and splits too. A tight cluster therefore drills a deep, narrow chain of nodes.
5. **Query** "everything in this rectangle": descend from the root, skipping any child whose square does not intersect the query rectangle, and collect points from the leaves you reach.

- **The adaptivity is entirely in the capacity check.** Nothing about the geometry decides depth — the *data* does. An empty quadrant stays one enormous leaf at depth 1; a dense district becomes a subtree nine levels deep. That is the property a fixed grid can never have.
- **Capacity is the one tuning knob.** Smaller capacity means deeper trees with smaller leaves (less scanning at the bottom, more pointer chasing on the way down); larger capacity means shallower trees and more linear scanning per leaf.
- **Cost one — the tree is unbalanced by design.** There is no depth bound. Worst case, many points at nearly identical coordinates split forever, so a real implementation needs a maximum depth (or a cell-size floor) beyond which leaves are simply allowed to overflow.
- **Cost two — clusters that straddle a split line get fragmented.** The root split is at the midpoint, not at the median of your data, so a dense district sitting on top of the centre line is torn across four separate subtrees. (A **k-d tree** splits at the median instead, which fixes this and costs you a rebuild to rebalance.)
- **Cost three — motion.** Every point that crosses a boundary is a delete plus an insert, plus possible splits and merges, all structural. That is why quadtrees index relatively static things — shops, geofences, sensor sites — far more often than a fleet of moving vehicles, where a flat computed grid wins because a move is two hash operations.
- **Cost four — it indexes points.** A quadtree over a road network has to decide which cell a 40 km highway belongs to, and there is no good answer. That is the next structure's job.`,
    },
    {
      type: 'code',
      lang: 'python',
      title: 'A quadtree in 40 lines — watch depth follow density',
      code: `import random
CAP = 4                                    # a leaf splits once it holds more than CAP points

class QT:
    def __init__(self, x0, y0, x1, y1):
        self.b, self.pts, self.kids = (x0, y0, x1, y1), [], None

    def child(self, p):                            # which quadrant does p fall in?
        x0, y0, x1, y1 = self.b
        return self.kids[(p[0] >= (x0 + x1) / 2) + 2 * (p[1] >= (y0 + y1) / 2)]

    def insert(self, p):
        if self.kids: return self.child(p).insert(p)    # internal node: just route
        self.pts.append(p)
        if len(self.pts) > CAP: self.split()            # this leaf is crowded

    def split(self):
        x0, y0, x1, y1 = self.b
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        self.kids = [QT(x0, y0, mx, my), QT(mx, y0, x1, my),
                     QT(x0, my, mx, y1), QT(mx, my, x1, y1)]
        pts, self.pts = self.pts, []
        for p in pts: self.child(p).insert(p)           # push points down

    def leaf_depths(self, d=0):
        if not self.kids: return [d]
        return [x for k in self.kids for x in k.leaf_depths(d + 1)]

    def nodes(self):
        return 1 if not self.kids else 1 + sum(k.nodes() for k in self.kids)

def blob(n, cx, cy, sd):                       # a dense district
    return [(random.gauss(cx, sd), random.gauss(cy, sd)) for _ in range(n)]

random.seed(7)
sets = [('uniform  (open country)', [(random.random(), random.random()) for _ in range(200)]),
        ('clustered(one district)', blob(200, 0.72, 0.31, 0.012)),
        ('mixed    (city + rural)', [(random.random(), random.random()) for _ in range(100)]
                                    + blob(100, 0.72, 0.31, 0.012))]
for name, pts in sets:
    t = QT(0.0, 0.0, 1.0, 1.0)
    for p in pts: t.insert(p)
    d = t.leaf_depths()
    print(f'{name}  nodes {t.nodes():4d}  leaves {len(d):4d}  leaf depth min {min(d)} max {max(d)}')

# --- real output ----------------------------------------------------------
# uniform  (open country)  nodes  129  leaves   97  leaf depth min 3 max 4
# clustered(one district)  nodes  181  leaves  136  leaf depth min 1 max 9
# mixed    (city + rural)  nodes  153  leaves  115  leaf depth min 2 max 8`,
      annotations: {
        2: 'Capacity is the only knob. Smaller means deeper trees and tiny leaves; larger means shallower trees and more linear scanning at the bottom.',
        13: 'Internal nodes carry no data — they only route. That is what makes a split a purely local operation on one leaf.',
        15: 'The entire adaptivity mechanism is this line. Nothing about the geometry chooses the depth; the density of the DATA does.',
        23: 'Re-insert, recursively. If all five points land in the same child, that child splits immediately too — which is exactly how a tight cluster drills a deep narrow chain.',
        47: 'Uniform points give a nearly balanced tree: every leaf at depth 3 or 4. This is the case a fixed grid also handles fine, so a quadtree buys you nothing here.',
        48: 'The same 200 points, clustered: leaves run from depth 1 (one huge leaf over an empty quadrant) to depth 9 (inside the district). One tree, eight levels of spread — that is what "adapts to density" means, and no fixed grid can do it.',
      },
    },
    {
      type: 'intuition',
      title: 'R-tree: the one that handles things with size',
      md: `*Attempt it: index 40 million road segments and building footprints so that "what is inside this viewport" is fast. Why does every point index fail before you start?*

- A road is a **polyline**; a building is a **polygon**; a lake covers three cities. A point index forces you to reduce each to a single coordinate — its midpoint — and a 40 km highway "at" its midpoint is invisible to every viewport it crosses but does not contain. The failure is not slowness, it is wrongness.
- **The R-tree's move: index the bounding box, not the object.** Wrap each geometry in its **minimum bounding rectangle** (MBR). Group nearby MBRs into a parent MBR that contains them all. Group those into grandparents. You get a **balanced** tree — like a B-tree, all leaves at the same depth, tuned so each node fills a disk page.
- **Query** "everything intersecting this rectangle": start at the root, and descend into **every** child whose MBR intersects the query. Leaves give you candidate geometries; then run the exact geometric test (does this polygon really intersect?) on the survivors. That two-phase shape — cheap bounding-box filter, then exact refinement — is how every spatial database works.
- **The defining difference from a quadtree: R-tree nodes can overlap.** A quadtree's four children are disjoint by construction, so a point query follows exactly one path. R-tree siblings' MBRs may overlap, so a query can be forced down several branches at once. Overlap is the enemy, and it is created by insertion order.
- That is why insertion heuristics are a whole literature: choose the child whose MBR needs the **least enlargement** to fit the new object, break ties by area, and on overflow split the node to minimise the resulting overlap. The \`R*-tree\` variant adds forced reinsertion (evict some entries and reinsert them) and measurably better splits — worth naming, because it is what most systems actually implement.
- **This is what PostGIS uses**, via Postgres's GiST index framework, and it is why \`WHERE geom && ST_MakeEnvelope(...)\` on a spatial index is fast where two B-tree range conditions on lat and lng are not. Same for Oracle Spatial, SQL Server, and SQLite's R-tree module.
- **When not to use it:** high-churn moving points. Every update rewrites bounding boxes up the tree, and overlap degrades as the data shifts, so you end up rebuilding. Moving points want a flat computed grid; static extents want an R-tree.`,
    },
    {
      type: 'note',
      md: `**Grid and geohash, two lines only — the Uber module owns this.** A fixed grid assigns every point a cell id computed by arithmetic (no tree, no rebalancing, and the cell id doubles as a shard key), and geohash is the grid whose ids are built by interleaving longitude and latitude bits so a shared string prefix means a shared cell. Its known failure — proximity does not imply a shared prefix, so you always query the centre cell plus its eight neighbours and filter by true distance — is proven with real coordinates in *Case Studies: YouTube/Netflix & Uber*. What follows here is the two systems that were built specifically because that grid was not good enough.`,
    },
    {
      type: 'intuition',
      title: 'S2: a cube, a Hilbert curve, and a 64-bit integer',
      md: `Google's S2 is the answer to "what if the grid respected the fact that the Earth is a sphere, and ordered its cells better?"

1. **Project the sphere onto a cube.** Six faces, each mapped with a curved projection chosen so cell areas stay within about a 2:1 ratio worldwide — versus roughly 5:1 for a naive tangent projection. Geohash, by contrast, works in raw latitude/longitude, so its cells shrink dramatically toward the poles.
2. **Subdivide each face like a quadtree**, always four children, down through **levels 0 to 30**. Level 0 is a whole face; level 30 is about a square centimetre. Useful middle: **level 12 ≈ 5 km²**, **level 16 ≈ 0.02 km²** (a city block), **level 20 ≈ 80 m²**.
3. **Order the cells along a Hilbert curve** and encode the position as a **64-bit integer**: 3 bits of face, two bits per level of subdivision, plus a trailing sentinel bit that records which level the cell is. One integer, sortable, and the parent of any cell is a bit mask away.

**Why the Hilbert curve, and not geohash's interleave.** Both are space-filling curves — that is the shared idea. But bit interleaving produces a **Z-order (Morton) curve**, which jumps: as it finishes one quadrant it teleports diagonally across to start the next, so two cells that are consecutive in the ordering can be far apart on the ground. The **Hilbert curve never jumps** — consecutive indices are always physically adjacent cells.

- The practical consequence is about **range scans**, which is what a 1-D index actually does. Covering a query region means expressing it as a set of intervals in the ordering. Fewer jumps means fewer, longer intervals — so an S2 region cover is a handful of ranges where a Z-order cover of the same region needs many more.
- It also softens (but does not remove) the boundary problem: neighbours are more often adjacent in the ordering, so a range scan catches more of them naturally.
- **Level is a per-object choice, and this is the S2 idea people miss.** You can cover a region with a *mixture* of levels — big cells for the interior, small cells along the edges — so a country and a car park are both indexed exactly as tightly as they deserve. A fixed-precision geohash cannot do that.
- **Cost, honestly**: it is a library dependency and the cell ids are unreadable integers, so debugging means a decoder. And it is still a square grid, so the neighbour-distance problem below is untouched.`,
    },
    {
      type: 'intuition',
      title: 'H3: hexagons, and the one property that made Uber build it',
      md: `**The killer property: a hexagon has six neighbours, and all six are the same distance away.**

- A square cell has **four edge-neighbours at distance d and four corner-neighbours at distance d√2 ≈ 1.41d**. So "expand one ring" means a different real radius in every direction, and every distance-weighted calculation over a square grid inherits that bias. Squares also have the ambiguity of corner-touching: two cells that share only a point — are they adjacent or not?
- A hexagon has one kind of adjacency (shared edges only) and one neighbour distance. Expanding rings is uniform, radius queries behave, and **smoothing a value across neighbouring cells is plain arithmetic** — which matters enormously when the cell value is something like a surge multiplier or a supply-demand ratio, because unsmoothed cells create a price cliff in the middle of a street.
- That is why Uber built and open-sourced **H3**: it was built for *aggregation and analysis* per cell at least as much as for lookup. Resolutions **0 to 15**; the useful ones here are **res 7 ≈ 5.2 km²**, **res 8 ≈ 0.74 km²** (edge ~460 m), **res 9 ≈ 0.11 km²** (edge ~174 m).
- **Caveat one — the pentagons.** You cannot tile a sphere with hexagons alone. H3 is built on an icosahedron, and its 12 vertices become **12 pentagon cells** at every resolution. They are deliberately positioned over ocean, but code that assumes "every cell has 6 neighbours" is wrong 12 times per resolution, and library functions have pentagon-specific branches.
- **Caveat two — hexagons do not nest exactly.** A hexagon cannot be partitioned into smaller hexagons. H3 uses an aperture-7 subdivision with a rotation, so a parent's seven children only **approximately** fill it: a little of each child spills outside the parent, and a little of the parent is covered by a neighbour's children. The consequence is operational, so say it in the interview: **you cannot roll up child counts to get an exact parent count.** Aggregations must be recomputed from the finest resolution, not summed up the hierarchy. S2, being a true quadtree on each face, does nest exactly — that is the trade.
- **Caveat three** — like S2, a library dependency with opaque 64-bit ids.`,
    },
    {
      type: 'intuition',
      title: 'Choosing: the four questions that pick the index',
      md: `Do not memorise a table. Ask these four, in order, and the answer falls out.

- **Points or extents?** Points (drivers, phones, pins, sensors) → grid, geohash, S2, H3, quadtree, all fine. Extents (roads, buildings, polygons, anything with a shape) → **R-tree**. Everything else is out, and this question alone settles most real cases.
- **Uniform or skewed density?** Uniform → a fixed grid is simplest and needs no library. Wildly skewed, and the objects are static → **quadtree** (or an R-tree, which is also density-adaptive because MBRs shrink around clusters). Wildly skewed and the objects move → a fixed grid with a **per-region resolution**, because tree maintenance under motion is the thing that actually hurts.
- **Do neighbour distances matter?** If you aggregate, smooth, or expand rings on cell values — surge zones, heatmaps, coverage, demand ratios — the square grid's 1× / 1.41× asymmetry is a real error and **H3** is the answer. If you only do point lookups, it never matters and hexagons are an unnecessary dependency.
- **Do you need exact hierarchy or cheap range scans?** Exact parent-child containment and mixed-level region covers → **S2**. Approximate hierarchy is fine and you want unbiased neighbours → **H3**. Neither, and you want zero dependencies on a whiteboard → **geohash**.
- Two shortcuts worth saying out loud. If the data already lives in Postgres, the answer is usually **PostGIS**, and you get an R-tree without building anything. And if you are designing under time pressure, **start with geohash, name the specific artefact that would push you to H3 or S2, and move on** — that sequencing is itself the senior signal.`,
    },
    {
      type: 'intuition',
      title: 'The map itself: a directed, weighted, time-dependent graph',
      md: `*Attempt it: model a road network as a graph. What are the nodes, what are the edges, what is the weight, and what does a "no left turn between 8 and 11" sign do to your model?*

- **Nodes are intersections; edges are road segments.** An edge carries geometry (the polyline you draw), a road class, speed limits, and access restrictions.
- **The weight is time, not distance.** This is the whole point, and it is where naive designs die: a 2 km motorway link beats a 900 m route through a market. Distance is a property you display; time is the property you optimise.
- **Weights are time-dependent.** The same edge is 40 seconds at 04:00 and 4 minutes at 18:00. Formally the weight is a function \`w(edge, departure_time)\`, and that breaks the assumption every textbook shortest-path algorithm makes. In practice: a **speed profile** per segment per (time-of-day, day-of-week) bucket, plus a live correction.
- **One-way streets are just directed edges**, which is why the graph is directed and why the reverse graph (needed for bidirectional search) has to be materialised or computed.
- **Turn restrictions do not fit on an edge at all.** "No left from Main onto Oak" is a property of a *pair* of edges, and a node cannot express it. Two standard fixes: (1) an **edge-based graph**, where nodes become road segments and edges become permitted turns — clean, and it lets you price turn cost (a left across traffic really is slower), but it multiplies graph size by roughly 2–4×; or (2) keep the node-based graph and carry a **turn table** consulted during expansion — smaller, but every algorithm must know about it. Most production routers use the edge-based expansion.
- **Scale.** A continental routable network is tens of millions of nodes and, once expanded for turns, on the order of **10⁸ directed edges**. At ~20 bytes per edge that is a couple of gigabytes — which is why routing servers hold the whole graph **in RAM** and treat a disk-backed graph as a non-starter.`,
    },
    { type: 'visual', component: 'GraphTraversal', props: { algorithm: 'dijkstra' } },
    {
      type: 'note',
      md: `Watch what Dijkstra does above and then imagine it at country scale. It settles nodes in increasing order of cost from the source, so at every instant the settled set is a **blob growing outward in all directions** — it has no idea where the destination is, and it will happily explore hard *away* from it until the blob is big enough to swallow it. On eight nodes that is invisible. On a national road graph it is fatal, and the next section does the arithmetic. \`A*\` changes exactly one line of this picture: pop by \`g(n) + h(n)\` instead of \`g(n)\`, where \`h\` is an optimistic guess of the time still to go. The blob stops being a circle and becomes an ellipse stretched toward the target. Set \`h = 0\` and \`A*\` *is* Dijkstra — the cleanest way to state the relationship when asked. (Dijkstra itself is drilled in the DSA module *Graphs II: Dijkstra, Bellman-Ford, DSU & MST*.)`,
    },
    {
      type: 'intuition',
      title: 'Routing, step 1: why Dijkstra is correct and unusable',
      md: `*Attempt it: Delhi to Mumbai is about 1,400 km by road. Before reading on, estimate what fraction of India\'s road graph a plain Dijkstra query touches.*

- Dijkstra settles **every node whose cost is less than or equal to the destination's cost**. Geometrically that is a disc of radius ~1,400 km centred on Delhi.
- Area: π × 1,400² ≈ **6.2 million km²**. India's total land area is **3.3 million km²**. The disc is nearly twice the country, so clipped to land it is **essentially every road in India**, plus a good deal of Pakistan, Nepal, Bangladesh and Tibet.
- If India's routable graph is on the order of 10⁷ nodes, that is tens of millions of heap operations per query — hundreds of milliseconds to seconds on one core, for **one** route. Multiply by thousands of route requests per second and the answer is not "buy more servers", it is "different algorithm".
- The asymmetry is what makes it absurd: the answer is a thin ribbon of maybe 20,000 edges, and you visited ten million nodes to find it. **All of the work is spent exploring in the wrong direction**, because plain Dijkstra has no notion of a target.
- Two families of fixes follow, and the interview wants both. **Query-time fixes** (\`A*\`, bidirectional search) make the search smarter and need no preprocessing. **Preprocessing fixes** (contraction hierarchies, ALT, hub labels) do work up front and make queries almost free. Real systems use both.`,
    },
    {
      type: 'math',
      intro: 'The arithmetic that makes the case, in four lines.',
      latex: [
        '\\text{Dijkstra explores} \\approx \\pi r^{2} = \\pi (1{,}400\\ \\text{km})^{2} \\approx 6.2\\times10^{6}\\ \\text{km}^{2} \\quad (\\text{India} = 3.3\\times10^{6}\\ \\text{km}^{2})',
        '\\text{bidirectional} = 2 \\cdot \\pi\\!\\left(\\tfrac{r}{2}\\right)^{2} = \\tfrac{\\pi r^{2}}{2} \\quad\\Rightarrow\\quad \\text{half the area, same answer}',
        '\\text{settled nodes:}\\quad \\text{Dijkstra} \\sim 10^{7} \\;\\longrightarrow\\; \\text{CH} \\sim 10^{3} \\quad (\\approx 10^{4}\\times\\ \\text{fewer})',
        '\\text{tiles at zoom } z = 2^{z}\\times 2^{z} \\quad\\Rightarrow\\quad z = 20:\\ 2^{40} \\approx 1.1\\times10^{12}\\ \\text{tiles}',
      ],
    },
    {
      type: 'intuition',
      title: 'Routing, step 2: A-star and bidirectional search',
      md: `**\`A*\`: aim the search.** Pop the node minimising \`g(n) + h(n)\` — cost so far plus an estimate of cost remaining — instead of \`g(n)\` alone.

- On a road graph the natural heuristic is **great-circle distance from n to the target, divided by the maximum legal road speed**. Distance over speed gives a time, which is the unit the weights are in.
- **Admissibility is the correctness condition: \`h\` must never overestimate the true remaining cost.** With an admissible \`h\`, \`A*\` still returns the optimal route. Divide by max speed and you are safe, because no route can beat the straight line at the fastest legal speed.
- **What happens if it overestimates** — for example, if a well-meaning engineer divides by *average observed* speed to make it "more realistic": the search may settle the goal via a suboptimal path and stop. You get a fast answer that is quietly wrong, and it will not look wrong — it will look like a slightly odd route, which is much harder to catch than a crash.
- (The deliberate version of that has a name: **weighted \`A*\`**, where you multiply \`h\` by ε > 1 to trade optimality for speed with a *bounded* suboptimality factor. That is legitimate; the accidental version is a bug.)
- **Why \`A*\` helps a lot on road networks:** the heuristic is genuinely informative because roads roughly follow geography, so straight-line distance is a decent lower bound and the search stops wandering backwards. **Why it is not enough:** dividing by the *maximum* speed makes \`h\` loose on the majority of the search, which happens on slower roads, so near the source \`A*\` behaves a lot like Dijkstra. Typical real speedup is a few times, not a few thousand.

**Bidirectional search: halve the area.** Run one search forward from the source and another backward from the target on the reverse graph, alternating, until they meet.

- **The area argument, which is the answer to "why does it help":** one search of radius r explores πr². Two searches of radius r/2 explore 2 × π(r/2)² = πr²/2 — exactly **half**. On a graph whose reachable set grows faster than quadratically, the saving is larger still.
- **The bug everyone writes: stopping the moment the frontiers touch.** Touching does not mean optimal. The correct rule is to keep going until the sum of the two frontier keys exceeds the best complete path found so far, and to keep updating that best path whenever a node is settled on one side that the other side has already seen.
- Combining with \`A*\` gives **bidirectional \`A*\`**, which works but is fiddly: the two heuristics must be made *consistent* with each other, or the termination condition breaks. This is exactly the kind of subtlety that pushes production systems toward preprocessing instead.`,
    },
    {
      type: 'intuition',
      title: 'Routing, step 3: contraction hierarchies, the real answer',
      md: `*Attempt it: you may spend hours of CPU before any query arrives. How do you make a 1,400 km route cost microseconds?*

The insight: long routes almost always use motorways in the middle and only touch small streets near the two ends. So build that structure into the graph.

1. **Order every node by importance** — a heuristic, typically "how many shortcuts would contracting this node create" (edge difference), plus how many of its neighbours are already contracted, so the ordering spreads out.
2. **Contract nodes one at a time, least important first.** To contract node v, look at every pair of its remaining neighbours (u, w). If the shortest path from u to w goes through v, add a **shortcut edge** u→w with the combined weight, so removing v loses nothing. A **witness search** first checks whether some other path from u to w is already as short — if so, no shortcut is needed, which keeps the graph from exploding.
3. **Result**: the original graph plus shortcut edges, and every node carrying a level.
4. **Query**: a bidirectional search where **both sides only ever move upward in the hierarchy** — forward from the source going up, backward from the target going up — and they meet somewhere near the top. The theorem that makes it work is that for every shortest path there exists an equivalent up-then-down path in the contracted graph.

- **The numbers.** Preprocessing a continental graph takes minutes to a couple of hours and adds roughly 30–100% more edges. A query settles on the order of **a thousand nodes instead of ten million** and returns in ~100 microseconds — a four-order-of-magnitude improvement, with the exact same answer.
- **The honest cost, and it is the one that matters: the preprocessing assumes the edge weights are fixed.** Change one road's travel time and the shortcut weights that were derived through it are potentially wrong. You cannot rerun a two-hour preprocessing every two minutes when traffic updates.
- **That single sentence is why live traffic is layered on rather than baked in**, and why the industry answer is **customizable route planning (CRP)**: split preprocessing into a slow, metric-*independent* phase (partition the graph into cells — done when the map changes, which is rarely) and a fast **customization** phase that recomputes only the weights within that fixed partition, in seconds. New traffic → re-customize in seconds → queries stay around a millisecond. Being able to name that split is the difference between "I have read about CH" and "I have thought about CH in production".`,
    },
    {
      type: 'note',
      md: `**Two more preprocessing techniques, one line each — name them and move on.** **ALT** (\`A*\`, Landmarks, Triangle inequality): pick a few dozen landmark nodes and precompute every node's distance to and from each; the triangle inequality then gives a far tighter admissible lower bound than great-circle distance, typically 10–100× fewer settled nodes, with preprocessing in minutes and memory of just \`|V| × landmarks\` — and crucially it degrades gracefully when weights change, since a slightly stale landmark distance only weakens the bound rather than breaking correctness. **Hub labeling**: precompute for every node a small sorted label of "hubs" with distances, arranged so any two nodes share a hub on their shortest path; a query is then a merge of two sorted lists and runs in **sub-microseconds** — the fastest known method, at the cost of labels totalling tens of gigabytes for a continent. The ladder to remember: Dijkstra → \`A*\` → bidirectional → ALT → CH/CRP → hub labels, trading preprocessing time and memory for query time at every step.`,
    },
    {
      type: 'intuition',
      title: 'ETA: the graph gives a baseline, not an answer',
      md: `*Attempt it: your router returns "sum of edge times = 34 minutes". Why is that number systematically wrong, and always in the same direction?*

- **Because the graph models roads, not driving.** Edge weights are free-flow travel times. Reality adds signal waits, queueing at intersections, left turns across traffic, pedestrian crossings, roundabout yields, bus stops, parking manoeuvres at both ends, and acceleration and deceleration between all of them.
- **Every one of those adds time and almost none subtract it.** That is why the pure graph answer is not just noisy but **systematically optimistic** — a biased estimator, not an unbiased one. A model that only corrected the variance would still be late.
- **So production ETA is a learned model**, and the smart formulation is to predict the **residual** over the routing baseline rather than the absolute duration. Residuals are small, roughly centred, and far easier to learn than "how long does a journey take".
- **Features**, grouped so you can rattle them off: *route structure* (segment sequence, road classes, number of turns and signals, total distance); *historical* speed profiles per segment per time-of-day and day-of-week bucket; *live* traffic speeds on those segments right now; *incidents* (crashes, closures, works) and events; *conditions* (weather, daylight, school terms); and *behaviour* (this driver's or this vehicle class's historical deviation).
- **Labels are free and perfect** — every completed trip is a labelled example — so retraining is continuous and the dataset grows by itself. That is a luxury most ML systems do not have, and worth naming.
- **The loss function is asymmetric on purpose.** Arriving five minutes early costs a user nothing; arriving five minutes late costs them a meeting. Penalise under-prediction harder than over-prediction, and report calibration and tail error, not just RMSE.
- **One prediction subtlety worth a sentence:** you are estimating conditions on segment k at the time you will *reach* it, twenty minutes from now — not the conditions there now. Serious systems feed a short-horizon traffic *forecast* into the weights rather than the current reading.
- The modelling side proper — gradient boosting versus neural approaches, feature leakage, time-series validation — belongs to the ML subject: *Ensembles: Bagging, Random Forest & Gradient Boosting*, *Feature Engineering & Data Leakage*, and *Recommendation Systems & Time-Series Basics*. Serving it at low latency belongs to *Serving Patterns, Feature Stores & Testing ML Code*. Do not re-derive them in a design interview; name them as the dependency and give the model a latency budget and a fallback.`,
    },
    {
      type: 'intuition',
      title: 'Live traffic: your users are the sensors, and the loop bites',
      md: `- **Where the data comes from: anonymized speed probes.** Phones running the maps app periodically report their position and speed; the backend map-matches each trace onto road segments and derives a speed per segment. No roadside hardware, global coverage, and it improves with adoption — the reason incumbents are hard to dislodge.
- **Aggregation**: per segment, per short window (a minute or two), take a robust central estimate (a median or trimmed mean, not a mean — one parked-but-moving-slowly device skews an average badly), and require a **minimum number of distinct devices** before publishing a speed at all. Below that threshold, fall back to the historical profile for that segment and time bucket.
- **The privacy line, said honestly**: this is location data about identifiable people, and "we anonymize it" is not by itself a true statement about location traces — a trace with a home end and a work end is often uniquely identifying. The mitigations that actually do work are aggregation thresholds (never publish from too few devices), dropping the start and end portions of every trip before aggregation, short retention on the serving path, and noise added to low-count aggregates. They reduce the risk; they do not eliminate it. Treat it as a hard design constraint you state, not a footnote.
- **The feedback loop, which is the interesting failure.** The router observes a jam on the highway and sends everyone down a residential side street. Ten minutes later the side street is the jam, the highway has cleared, and the router flips everyone back. **The routing system is a controller acting on the system it is measuring**, and a controller with no damping oscillates.
- Fixes, and they are all control-theory-shaped: **randomise among near-equal alternatives** so flow is split rather than switched; **cap the fraction of traffic assignable to low-capacity roads** (a residential street is not a valid overflow route regardless of what the graph says); **route on predicted future state** rather than current state, since you arrive later; and **damp the updates** so weights cannot swing on a single window.
- The second-order version, worth mentioning if pushed: at scale this is no longer shortest-path per user but something closer to **traffic assignment** — the socially optimal allocation and the individually optimal one are not the same route, and every product in this space quietly chooses to serve the individual.`,
    },
    {
      type: 'intuition',
      title: 'Map matching: snapping a noisy trace to the road graph',
      md: `*Attempt it: raw GPS says you are 12 metres east of the highway, on a service road. Is the fix "snap to the nearest road"? Name the two places that breaks.*

- **The input is worse than people assume.** GPS is ±5 m under open sky, ±20–50 m in an urban canyon where signals bounce off towers (multipath), and it degrades exactly where road density is highest — city centres, where the roads are closest together.
- **Naive nearest-road snapping fails at:** flyovers and elevated expressways (the elevated road and the surface road beneath it are metres apart horizontally); **parallel service roads** running alongside a highway; dual carriageways; and multi-level interchanges. In every one of those cases the nearest road is frequently the wrong road.
- **The fix is to stop treating points independently.** Model the trace as a **hidden Markov model**: the hidden states at each timestep are the candidate road segments near that GPS point; the **emission probability** is how likely that observation is if you really were on that segment (a Gaussian in the perpendicular distance); and the **transition probability** is how plausible it is to move from candidate segment A at time t to candidate segment B at time t+1 — computed by comparing the actual driving distance between them along the road graph with the straight-line distance between the two observations. Then **Viterbi** picks the single most likely sequence over the whole trace.
- **Why that fixes the flyover:** a point sitting 4 m from the surface road and 9 m from the flyover has a better *emission* score on the surface road — so per-point snapping takes it. But its neighbours are confidently on the flyover, and the *transition* from flyover to surface road and back requires exiting and re-entering, maybe 1.8 km of driving, in the four seconds between pings. That transition probability is essentially zero, so Viterbi rejects it. **One bad point cannot derail a good trace**, which is the entire advantage over point-wise snapping.
- Map matching is not an optional cleanup step: **every downstream number depends on it.** Traffic speeds are attributed per segment, trip distance and fare come from the matched path, and the ETA model's training labels are only as good as the segments they were attached to.`,
    },
    {
      type: 'visual',
      component: 'PointerBoxDiagram',
      props: {
        title: 'Map matching: why the nearest road is the wrong road',
        notice: 'Left: GPS observations arriving every 4 seconds. Right: the candidate road segments each one could belong to. Watch frame 3 make the wrong call before frame 5 overrules it.',
        leftLabel: 'GPS trace',
        rightLabel: 'candidates',
        frames: [
          {
            note: 'A vehicle is driving along an elevated expressway. Beneath it, offset by about 8 metres horizontally, runs the surface road. GPS cannot see altitude usefully, so at every timestep both roads are plausible candidates.',
            stack: [{ name: 'p1 (t=0s)', to: 'fly' }],
            heap: [
              { id: 'fly', value: 'segment E7 — flyover', label: 'p1 is 3 m away' },
              { id: 'surf', value: 'segment S4 — surface road', label: 'p1 is 11 m away' },
            ],
          },
          {
            note: 'p2 arrives four seconds later. Still comfortably closer to the flyover. Per-point snapping and HMM agree so far, which is why this bug hides in testing on clean data.',
            stack: [{ name: 'p2 (t=4s)', to: 'fly' }],
            heap: [
              { id: 'fly', value: 'segment E7 — flyover', label: 'p2 is 4 m away' },
              { id: 'surf', value: 'segment S4 — surface road', label: 'p2 is 12 m away' },
            ],
          },
          {
            note: 'p3 is the bad reading — a signal bounce off a tower puts it 4 m from the surface road and 9 m from the flyover. Naive nearest-road snapping takes the surface road, and the matched path becomes flyover, surface, flyover. Nobody drove that.',
            stack: [{ name: 'p3 (t=8s) nearest-road snap', to: 'surf', danger: true }],
            heap: [
              { id: 'fly', value: 'segment E7 — flyover', label: 'p3 is 9 m away' },
              { id: 'surf', value: 'segment S4 — surface road', label: 'CHOSEN — p3 is 4 m away', danger: true },
              { id: 'path', value: 'E7 -> S4 -> E7', label: 'physically impossible', danger: true },
            ],
          },
          {
            note: 'The HMM scores the same choice differently. Emission still favours S4 for this one point. But the transition E7 -> S4 requires leaving the expressway at the next ramp and doubling back — about 1.8 km of driving — in the 4 seconds since p2, while the two observations are only 60 m apart. That transition probability is effectively zero.',
            stack: [{ name: 'transition E7 -> S4', to: 'trans', danger: true }],
            heap: [
              { id: 'trans', value: 'road distance 1,800 m vs GPS gap 60 m', label: 'implausible', danger: true },
              { id: 'stay', value: 'road distance 62 m vs GPS gap 60 m', label: 'E7 -> E7: plausible' },
            ],
          },
          {
            note: 'Viterbi maximises the whole sequence, not each point. Emission loses to transition here, so p3 is matched to the flyover despite being individually closer to the surface road. One bad observation cannot derail the trace — and that is the entire reason to use an HMM instead of a nearest-road lookup.',
            stack: [{ name: 'Viterbi over p1..p5', to: 'best' }],
            heap: [
              { id: 'best', value: 'E7 E7 E7 E7 E7', label: 'globally most likely path' },
              { id: 'out', value: 'speed, distance, fare, ETA labels', label: 'everything downstream depends on this' },
            ],
          },
        ],
      },
    },
    {
      type: 'intuition',
      title: 'Serving: tiles, and the query mix that actually hits you',
      md: `*Attempt it: how do you ship the map picture itself to a hundred million phones? And which of your three request types is the expensive one?*

**Tiles.** The world at zoom level z is a 2ᶻ × 2ᶻ grid of square tiles, each addressed by \`(z, x, y)\`. Zoom 0 is one tile for the whole planet; every zoom in quarters the area per tile. At zoom 20 that is 2⁴⁰ ≈ **1.1 trillion** possible tiles — so you pre-render the popular ones and generate the rest on demand.

- **Raster tiles**: pre-rendered images, typically 256×256. Dead simple for the client, and terrible for variety — you need a separate rendered set per style, per language, per screen density, and labels are baked in so they cannot rotate or rescale smoothly.
- **Vector tiles**: the geometry and attributes shipped in a compact binary form, with styling and label placement done **on the client**. One tile set serves every style, language and DPI; you get smooth zoom, rotation, tilt and dark mode for free. The costs are a heavier client, real GPU/CPU work on the device, and a much more complex renderer.
- **Why tiles are the perfect CDN object**, and this is the part interviewers want: the URL is derived entirely from \`(z, x, y)\` plus a map-data version, the content is **immutable** for that version, there is no personalisation and no auth-varying content, and access has enormous locality — a small fraction of tiles (cities) serve the overwhelming majority of requests. So you set a one-year immutable cache header, put the **map version in the URL path**, and a new map release becomes a *new URL* rather than a cache invalidation. Never invalidate a trillion objects; change the key. (Cross-ref *Blob Storage, CDNs, API Gateways & Rate Limiting*.)
- CDN hit rates in the high nineties are normal, so the origin renderer only ever sees genuine long-tail misses.

**The query mix**, which is the reframing that makes the design tractable:

- **Viewport tiles** — overwhelmingly the most requests. A 1080×2000 phone screen shows roughly 33 tiles at 256 px, and panning and prefetching push a session well past that. But every one of them is CDN-cacheable, so this enormous number costs your backend almost nothing.
- **Search and geocoding** — "coffee near me", "221B Baker Street". A different index entirely: an inverted text index plus a spatial filter plus ranking. Cross-ref *Case Studies: Search Autocomplete & Web Crawler*.
- **Route requests** — the smallest count and by far the highest cost per request: a graph query, feature fetches, and a model inference. **This is the one to design around.**
- **Caching routes is subtler than caching tiles**, and the good answer separates two things with different lifetimes. Exact origin-destination pairs are near-unique, so a naive route cache has a miserable hit rate. But the **path** for a popular corridor changes slowly (cache it for minutes) while the **ETA** for that path changes fast (recompute it every request). Cache the geometry, recompute the number. Coarse **cell-pair travel times** — origin cell to destination cell for a time bucket — are also cacheable with a short TTL and cover a lot of "roughly how far is it" traffic.`,
    },
    {
      type: 'intuition',
      title: 'Bottlenecks and tradeoffs',
      md: `- **Preprocessing versus freshness — the central tension of this whole module.** Contraction hierarchies give microsecond queries and assume fixed weights; live traffic changes weights every couple of minutes. Every option is a point on one curve: full CH (fastest queries, stalest weights), **CRP** (metric-independent partition once, seconds-long re-customization per traffic update, ~1 ms queries — the practical answer), ALT (weight changes only loosen the bound, never break correctness, at a smaller speedup), or plain bidirectional \`A*\` (always fresh, far slower). Name the curve and pick a point on it; do not pretend there is a free option.
- **Exactness versus speed.** Nobody needs the provably optimal route; they need a good route now. Weighted \`A*\` with a bounded suboptimality factor, beam-limited search, and "return the best path found within a 20 ms budget" are all legitimate designs. The sentence to say: **optimality is a property you are allowed to sell for latency, provided the suboptimality is bounded and you can state the bound.** What you must not do is lose optimality by accident through an inadmissible heuristic — deliberate is fine, silent is a bug.
- **Global coverage versus per-region data quality.** The road graph, the turn restrictions, the speed profiles and the probe density are excellent where you have many users and thin where you do not. A new market has wrong one-ways, missing restrictions and no historical profiles — so ETA is worst exactly where you have the least data to fix it, and it usually errs optimistic because the missing information is almost all friction. Mitigations: fall back to road-class default speeds, shrink to global priors where local data is sparse, weight user reports and edits heavily, and derive missing roads from imagery. The design decision: one global model is cheap and mediocre everywhere; per-region models are excellent where data is thick and unusable where it is thin. The workable answer is a global model with regional features plus a **data-density-aware fallback**, and monitoring split by region so a bad market is visible instead of averaged away.
- **The control loop.** Routing changes the traffic it measures, so anything that reacts instantly to a single observation window will oscillate. Damping, flow splitting and predicted-state routing are not polish; they are the difference between a working router and one that herds its users into side streets.
- **Degradation, in the right order.** If the ETA model is slow or down, fall back to the routing baseline — a slightly optimistic number beats a spinner. If live traffic is stale, fall back to historical speed profiles. If the CH structures are mid-rebuild, fall back to bidirectional \`A*\` on the live graph. Every layer here has a strictly worse but correct fallback, which is unusually lucky, and a design that names them is a design that survives a bad day.`,
    },
    {
      type: 'note',
      md: `**The 60-second version.** Spatial indexes are chosen by four questions: points or extents (extents force an R-tree, which indexes bounding boxes in a balanced overlapping tree — this is what PostGIS uses); uniform or skewed density (skewed and static favours a quadtree, whose depth follows the data because a leaf splits only when it is crowded); whether neighbour distances matter (they do for any per-cell aggregation, and only hexagons make all six neighbours equidistant — hence H3, with 12 pentagons and only approximate parent nesting as the price); and whether you need exact hierarchy and cheap range scans (S2: cube projection, Hilbert curve, 64-bit id, mixed-level covers). Routing is a separate problem: Dijkstra explores a disc, so Delhi to Mumbai would touch essentially all of India, and \`A*\` with an admissible great-circle heuristic plus bidirectional search only buys a constant factor. The real answer is preprocessing — contraction hierarchies take queries to ~100 µs — and its honest cost is that shortcuts assume fixed weights, which is why live traffic is layered on via CRP-style re-customization rather than baked in. ETA is then a learned model correcting the routing baseline, which is systematically optimistic because the graph knows about roads and not about signals and queues. Traffic comes from anonymized probes with aggregation thresholds, and the router is a controller that changes what it measures. And the map picture itself is tiles: immutable, versioned in the URL, and served almost entirely by a CDN.`,
    },
  ],
  quiz: [
    {
      question: 'You must index 40 million road segments and building footprints to answer "what is inside this viewport". Which structure?',
      options: [
        { text: 'A geohash grid over each object\'s midpoint', explanation: 'The midpoint discards the extent. A 40 km highway would live at one point, so it would be missed by every viewport that crosses it without containing that midpoint. The failure is wrongness, not slowness.' },
        { text: 'A quadtree of points', explanation: 'Same defect: a quadtree indexes points, and a road or a polygon has no single point. You would have to pick a representative coordinate and accept the same wrong answers.' },
        { text: 'An R-tree over minimum bounding rectangles', explanation: 'Correct. R-trees index each object\'s bounding box and group boxes into parent boxes, so objects with extent are represented honestly. A query descends into every intersecting box and then runs exact geometry tests on the candidates. This is what PostGIS gives you through GiST.' },
        { text: 'H3 cells at resolution 12', explanation: 'You can tile a polygon into covering cells, and people do — but you multiply storage by the number of covering cells per object, updates get expensive, and you still need exact geometry tests. Reasonable as an analytics representation, wrong as the primary index.' },
      ],
      correct: 2,
    },
    {
      question: 'You insert 200 points into a quadtree with leaf capacity 4. Uniform points give leaf depths of 3 to 4. A tight cluster gives leaf depths from 1 to 9. What does that demonstrate?',
      options: [
        { text: 'The tree adapts to density: an empty quadrant stays one huge shallow leaf while the dense district splits until each leaf holds at most 4 points — the same tree is shallow and deep at once', explanation: 'Correct. The only thing that triggers a split is a leaf exceeding capacity, so depth is decided entirely by the data. That is precisely what a fixed grid cannot do, and it is the reason quadtrees exist.' },
        { text: 'The implementation is unbalanced and needs rebalancing', explanation: 'The imbalance is the feature, not a defect. A balanced structure would force the same cell size on empty ocean and a dense city block.' },
        { text: 'Clustered data always produces fewer nodes than uniform data', explanation: 'Measured in the demo, the clustered set produced MORE nodes (181 versus 129) because the deep chain adds four children per level. Node count and depth are separate stories.' },
        { text: 'Leaf capacity should be raised until the tree is balanced', explanation: 'Raising capacity flattens the tree by turning every leaf into a longer linear scan. At capacity 200 you have one leaf and no index at all.' },
      ],
      correct: 0,
    },
    {
      question: 'Both geohash and S2 use a space-filling curve. Why does S2 use a Hilbert curve instead of the Z-order curve that bit interleaving produces?',
      options: [
        { text: 'Hilbert cells are hexagonal, so neighbours are equidistant', explanation: 'That is H3, and its cells are hexagons. S2 cells are quadrilaterals on a projected cube — the curve determines their ORDER, not their shape.' },
        { text: 'The Hilbert curve needs fewer bits for the same precision', explanation: 'Both need two bits per level of subdivision. Precision per bit is identical; only the ordering differs.' },
        { text: 'The Z-order curve preserves locality better, and S2 accepts a worse curve for a simpler implementation', explanation: 'Backwards on both counts. Hilbert has strictly better locality, and it is the harder one to implement — S2 pays that cost deliberately.' },
        { text: 'The Hilbert curve never jumps: consecutive indices are always adjacent cells, so a region collapses into fewer and longer 1-D ranges', explanation: 'Correct. The Z-order curve teleports diagonally when it finishes a quadrant, so cells that are consecutive in the ordering can be far apart on the ground. Since a spatial query is executed as a set of range scans over the 1-D index, fewer discontinuities means fewer ranges to scan.' },
      ],
      correct: 3,
    },
    {
      question: 'Which statement about H3 is TRUE?',
      options: [
        { text: 'Hexagons tile a sphere exactly, so H3 needs no special cases', explanation: 'They cannot. H3 is built on an icosahedron and has 12 pentagon cells at every resolution, positioned over ocean but still requiring special branches in library code.' },
        { text: 'A resolution-9 cell nests exactly inside its resolution-8 parent, so child counts can be summed to get the parent count', explanation: 'This is the caveat people miss. Hexagons cannot be partitioned into hexagons; H3 uses an aperture-7 subdivision with a rotation, so children only approximately fill the parent. Aggregations must be recomputed from the finest resolution, never rolled up.' },
        { text: 'All six neighbours of a hexagon are equidistant, but there are 12 pentagons and children only approximately fill their parent', explanation: 'Correct — the property and both prices, together. Equidistant neighbours are why Uber built it (a square grid has 4 neighbours at d and 4 at 1.41d, which biases every ring expansion and every smoothed per-cell value). The pentagons and inexact nesting are the cost of getting that on a sphere.' },
        { text: 'Every H3 cell at a given resolution has exactly the same area worldwide', explanation: 'Areas vary across the globe and vary sharply around the pentagons. H3 is much more uniform than raw latitude/longitude cells, but "exactly the same" is false.' },
      ],
      correct: 2,
    },
    {
      question: 'A plain Dijkstra query from Delhi to Mumbai (about 1,400 km by road) settles which part of the graph?',
      options: [
        { text: 'Only the highway corridor between them, because the highway is the cheapest path', explanation: 'Dijkstra has no idea where Mumbai is. It cannot prefer the corridor, because preferring anything requires knowing the destination — which is exactly what the heuristic in A-star adds.' },
        { text: 'Every node whose cost is at most the destination\'s: roughly a 1,400 km disc of about 6.2 million square kilometres, larger than India itself — so essentially the entire national road graph, per query', explanation: 'Correct. Pi times 1,400 squared is about 6.2 million square kilometres against India\'s 3.3 million, so clipped to land the search covers the country plus its neighbours. Tens of millions of settled nodes to find a ribbon of perhaps twenty thousand edges — almost all the work is spent exploring away from the answer.' },
        { text: 'About half the graph, since Dijkstra is bidirectional by default', explanation: 'Plain Dijkstra is unidirectional. Bidirectional search is a separate technique, and it is what buys the factor of two.' },
        { text: 'A narrow band, because the edge weights are travel time rather than distance', explanation: 'Time weights stretch the explored region along fast roads, so it is an anisotropic blob rather than a clean circle. It is still a blob growing outward around the origin, and still enormous.' },
      ],
      correct: 1,
    },
    {
      question: 'Your A-star uses h = great-circle distance divided by AVERAGE observed speed, instead of dividing by the maximum legal speed. What happens?',
      options: [
        { text: 'Nothing — it is just a scaling constant on the heuristic', explanation: 'It is the constant that decides admissibility. Dividing by a larger speed gives a smaller, safely optimistic estimate; dividing by a smaller speed can make the estimate exceed the true remaining time.' },
        { text: 'The search gets slower because the heuristic is now less informative', explanation: 'It usually gets FASTER, which is exactly the seduction. Speed is not the problem here; correctness is.' },
        { text: 'A-star degenerates into Dijkstra', explanation: 'That is what happens when h = 0. A larger heuristic pushes further from Dijkstra, not toward it.' },
        { text: 'The heuristic can now overestimate the remaining time, so A-star may settle the goal on a suboptimal path — a fast answer that is quietly wrong', explanation: 'Correct. Admissibility (never overestimating) is what guarantees A-star returns the optimal path. Break it and you get plausible-looking, slightly wrong routes, which is far harder to detect than a crash. The deliberate version of this trade is weighted A-star, which multiplies h by a factor and gives you a stated suboptimality bound.' },
      ],
      correct: 3,
    },
    {
      question: 'Bidirectional search roughly halves the explored area. What is the argument, and what is the classic implementation bug?',
      options: [
        { text: 'Two threads run in parallel so wall-clock time halves; the bug is a race on the shared visited set', explanation: 'That is parallelism, which is a different (and additional) win. The claim here is about total nodes settled, and it holds even single-threaded.' },
        { text: 'Two searches of radius r/2 explore 2 x pi(r/2)^2 = pi r^2 / 2, half of one search of radius r; the bug is stopping the moment the frontiers touch', explanation: 'Correct on both. The area argument is the reason it helps at all, and it understates the win on graphs whose reachable set grows faster than quadratically. And touching frontiers do NOT imply optimality — you must continue until the sum of the two frontier keys exceeds the best complete path found so far.' },
        { text: 'The backward search always reaches the meeting point first, so you can stop as soon as it does', explanation: 'There is no such guarantee, and stopping on either side arriving is precisely the bug that produces subtly suboptimal routes.' },
        { text: 'It halves the graph size by only loading the reverse graph', explanation: 'Bidirectional search needs BOTH the forward and the reverse graph. If anything it increases memory, and the reverse graph must be materialised or derived.' },
      ],
      correct: 1,
    },
    {
      question: 'Your router starts sending all traffic down a residential side street to avoid a highway jam. Ten minutes later the side street is jammed and the highway is clear.',
      options: [
        { text: 'Expected behaviour: the router is a controller acting on the system it measures. Fixes are randomising among near-equal alternatives, capping the share of flow assigned to low-capacity roads, and routing on predicted future state rather than current state', explanation: 'Correct. An undamped controller reacting to its own effects oscillates. Splitting flow instead of switching it, refusing to treat a residential street as valid overflow capacity, and predicting conditions at your arrival time rather than now are the three standard dampers.' },
        { text: 'A caching bug — the route cache is serving a stale path, so flush it', explanation: 'The path is fresh; that is the problem. Nothing here is stale, the system is faithfully reacting to real, current measurements.' },
        { text: 'The traffic model is undertrained; add more features and retrain', explanation: 'No number of features fixes a feedback loop. The model is correctly reporting a jam that the router itself created moments earlier.' },
        { text: 'Map matching failed and probes were attributed to the wrong segments', explanation: 'Map matching errors are a real source of bad speed data, but they would not produce this clean oscillation between two alternatives that tracks the router\'s own decisions.' },
      ],
      correct: 0,
    },
  ],
  interviewQuestions: [
    {
      question: 'Quadtree, R-tree, S2, H3 — which spatial index would you use for which problem, and why?',
      answer:
        'I would answer with four questions rather than a table. **Points or extents?** If the objects have shape — roads, buildings, polygons — every point index is simply wrong, because reducing a 40 km highway to its midpoint makes it invisible to viewports that cross it. That forces an **R-tree**, which indexes minimum bounding rectangles in a balanced tree and refines with exact geometry tests, and if the data already lives in Postgres the answer is PostGIS, which gives you that for free. **Uniform or skewed density?** Uniform, and a plain fixed grid is simplest. Skewed and static — shops, geofences, sensors — and a **quadtree** earns its keep, because a leaf splits only when it is crowded, so the same tree is one level deep over empty land and nine levels deep in a dense district. Skewed and moving, and I would go back to a flat computed grid with per-region resolution, because tree maintenance under constant motion is the thing that actually hurts. **Do neighbour distances matter?** If I aggregate or smooth per cell — surge zones, heatmaps, demand ratios — a square grid\'s four neighbours at d and four at 1.41d is a real bias, and **H3**\'s six equidistant neighbours is the fix; if I only do point lookups, hexagons are a dependency I do not need. **Exact hierarchy and cheap range scans?** **S2**: cube projection, Hilbert ordering, 64-bit ids, exact parent nesting and mixed-level region covers. The costs I would volunteer: H3 has 12 pentagons and only approximate child nesting, so you cannot roll up counts; S2 and H3 both mean a library and unreadable ids. And the sequencing that matters in a real design: start with geohash, name the specific artefact that would push me to H3 or S2, and move on.',
      isCaseBased: false,
    },
    {
      question: 'Case: design Google Maps\' ETA.',
      answer:
        'Split it in two immediately, because conflating routing and ETA is the trap. **Routing** is a graph problem: a directed graph of intersections and segments weighted by travel time, with one-ways as directed edges and turn restrictions expressed by expanding to an edge-based graph. Dijkstra is correct and unusable — a 1,400 km query explores a disc of about 6.2 million square kilometres, larger than India — so A-star with an admissible great-circle-over-max-speed heuristic and bidirectional search cut a constant factor, and **contraction hierarchies** take the query to roughly 100 microseconds by precomputing shortcut edges and answering with an up-down bidirectional search. **ETA** sits on top of that. The routing baseline is systematically optimistic, not merely noisy, because the graph models roads and not signal waits, queueing, turns across traffic, or pickup and drop-off dwell — every one of those adds time and almost none subtract it. So I would train a model to predict the **residual** over the baseline, which is a far easier target than absolute duration. Features: route structure (segment sequence, road classes, number of turns and signals), historical speed profiles per segment per time-of-day and weekday bucket, live probe speeds, incidents and closures, weather and events, and driver or vehicle-class behaviour. Labels are free and perfect — every completed trip — so retraining is continuous. Two subtleties I would raise unprompted: the loss should be **asymmetric**, because arriving late costs the user far more than arriving early, so under-prediction is penalised harder and I would monitor calibration and tail error rather than RMSE alone; and I am predicting conditions on segment k at the time I will *reach* it, so serious systems feed a short-horizon traffic forecast into the weights rather than the current reading. Serving: the model must answer inside the route request\'s budget, so heavy per-segment feature caching, and a circuit breaker that degrades to the pure routing baseline when it is slow — a slightly optimistic number beats a spinner. Everything upstream depends on **map matching** the probe traces correctly, or the speed features are noise. The model family itself — gradient boosting versus a neural approach, leakage, time-based validation — is an ML question I would name as a dependency rather than re-derive in a design round.',
      isCaseBased: true,
    },
    {
      question: 'Why is Dijkstra unusable for country-scale routing, and what does A-star actually buy you?',
      answer:
        'Dijkstra settles every node whose cost is at most the destination\'s cost, so the explored set is a blob growing outward from the origin in all directions — it has no notion of a target and will happily explore hard away from it. Do the arithmetic: Delhi to Mumbai is about 1,400 km, so the disc is pi times 1,400 squared, roughly 6.2 million square kilometres against India\'s 3.3 million. Clipped to land, that is essentially every road in the country plus a lot of the neighbours. Tens of millions of settled nodes, hundreds of milliseconds to seconds per query on one core, to find a ribbon of maybe twenty thousand edges. The asymmetry is the point: nearly all the work is in the wrong direction. A-star fixes the direction by popping on g(n) + h(n), with h the great-circle distance to the target divided by the maximum legal road speed — distance over speed, so the units match the weights. The correctness condition is admissibility: h must never overestimate, or A-star can settle the goal on a suboptimal path and return a plausible wrong route, which is much harder to catch than a crash. What it buys is real but bounded: typically a few times fewer settled nodes, because dividing by the *maximum* speed makes the bound loose over the majority of the search, which happens on slower roads — so near the source A-star behaves a lot like Dijkstra. That is exactly why production systems do not stop here. Bidirectional search adds another factor of two by the area argument (two discs of radius r/2 total half the area of one of radius r), and then preprocessing — ALT landmarks for a tighter admissible bound, or contraction hierarchies — takes you the remaining four orders of magnitude.',
      isCaseBased: false,
    },
    {
      question: 'Explain contraction hierarchies, including the cost you would have to live with.',
      answer:
        'The insight is that long routes use motorways in the middle and small streets only near the two ends, so bake that structure into the graph. Preprocessing: order nodes by an importance heuristic — commonly the edge difference, meaning how many shortcuts contracting this node would create, plus how many neighbours are already contracted so the ordering spreads. Then contract nodes from least important upward. To contract v, take every pair of its remaining neighbours u and w whose shortest path runs through v and add a **shortcut edge** u to w with the combined weight, so deleting v loses nothing; a **witness search** first checks whether some other path is already as short, and skips the shortcut if so, which is what stops the edge count exploding. The output is the original graph plus shortcuts, with every node carrying a level. A query is a bidirectional search in which both sides only ever move **upward** in the hierarchy and meet near the top, which is correct because every shortest path has an equivalent up-then-down path in the contracted graph. The numbers: minutes to a couple of hours of preprocessing for a continent, roughly 30 to 100 percent more edges, and queries that settle about a thousand nodes instead of ten million — around 100 microseconds, with the exact same answer as Dijkstra. The cost I would have to live with is that **the shortcut weights assume the edge weights are fixed**. One road slowing down potentially invalidates every shortcut derived through it, and you cannot rerun a two-hour preprocess every two minutes when live traffic updates. That is the whole reason traffic is layered on rather than baked in, and the industry answer is CRP: split preprocessing into a slow metric-independent partition, done only when the map itself changes, and a fast customization step that recomputes weights within that fixed partition in seconds. New traffic, re-customize in seconds, queries stay around a millisecond.',
      isCaseBased: false,
    },
    {
      question: 'Case: live traffic must update edge weights every two minutes, but your contraction-hierarchy preprocessing takes three hours. Design around it.',
      answer:
        'First I would refuse the framing that there is one answer, because this is a curve and the job is to pick a point on it and say why. **Option one, and the one I would build: CRP-style customizable preprocessing.** Split the three hours into a metric-*independent* phase — partition the graph into cells and precompute the overlay topology, which depends only on the road network and therefore only changes when the map changes, which is weekly at most — and a **customization** phase that recomputes only the weights inside that fixed partition. Customization runs in seconds, so a two-minute traffic cycle is comfortable, and queries land around a millisecond rather than a hundred microseconds. That millisecond is a price I will pay without argument. **Option two: layered correction.** Keep the CH built on historical profiles and apply live traffic only near the endpoints and on the top-level roads, re-running a local search where the deviation is large. Cheap, but correctness is now approximate and the failure mode is a route that ignores a jam in the middle. **Option three: ALT instead of CH.** Landmark distances degrade *gracefully* when weights change — a stale landmark distance only weakens the lower bound, it never breaks admissibility, so the router stays correct and merely gets slower. That is a genuinely attractive property under volatile weights, at maybe 10 to 100 times speedup instead of ten thousand. **Option four: tier the traffic.** Not every road needs two-minute freshness; motorways and arterials carry most of the deviation, so customize those often and residential roads rarely. I would also state the operational shape regardless of choice: customization is a background job producing an immutable weight version, servers load versions atomically and serve from one while the next is built, and a failed customization simply means the previous version stays live — never a partially updated graph. And I would name the fallback ladder: if customization falls behind, fall back to historical profiles; if the CH structures are mid-rebuild, fall back to bidirectional A-star on the live graph. Slower and correct beats fast and wrong.',
      isCaseBased: true,
    },
    {
      question: 'Why does an R-tree handle roads and buildings when a geohash grid cannot?',
      answer:
        'Because a geohash cell id is computed from a single coordinate, and a road does not have one. You can index a road by its midpoint, in which case a viewport that the road crosses but does not contain the midpoint of will miss it entirely — that is a correctness failure, not a performance one. You can tile the road into every cell it touches, which works and is what people do for analytics, but it multiplies storage by the covering cell count, makes updates expensive, and still needs exact geometry tests afterwards. The R-tree solves it structurally: index each object by its **minimum bounding rectangle**, group nearby MBRs into a parent MBR, and keep going, producing a balanced tree with all leaves at the same depth and node sizes tuned to a disk page. A window query descends into every child whose MBR intersects the query rectangle, collects candidates from the leaves, and then runs the exact predicate — the classic filter-then-refine shape every spatial database uses. The important structural difference from a quadtree is that **R-tree siblings may overlap**, because they are derived from the data rather than from a fixed subdivision, so a query can be forced down several branches at once. Overlap is created by insertion order, which is why the insertion heuristics matter so much: pick the child needing the least MBR enlargement, break ties on area, and split overflowing nodes to minimise overlap — and why the `R*-tree`, with forced reinsertion and better splits, is the variant most systems actually implement. This is what PostGIS gives you through GiST, and it is the reason a bounding-box operator on a spatial index is fast where two B-tree range conditions on latitude and longitude are not. Where I would not use it: high-churn moving points, because every update rewrites bounding boxes up the tree and overlap degrades as the data shifts.',
      isCaseBased: false,
    },
    {
      question: 'Case: users driving on an elevated expressway are getting routed onto the surface road beneath it, and their trip distances are wrong. Diagnose and fix.',
      answer:
        'This is a map-matching failure, almost certainly naive nearest-road snapping. GPS is plus or minus 5 metres under open sky but 20 to 50 metres in an urban canyon because of multipath off buildings, and it degrades precisely where roads are densest. An elevated expressway and the surface road below it are only metres apart horizontally, and GPS altitude is too coarse to separate them, so per-point nearest-road snapping flips between them whenever a reading drifts. The symptom set matches: wrong route, wrong distance, and — worse and probably not yet noticed — corrupted speed data attributed to the wrong segment, which poisons the traffic layer and the ETA model\'s training labels. The fix is to stop treating points independently and model the trace as a **hidden Markov model**: hidden states are the candidate segments near each GPS point; the emission probability is a Gaussian in perpendicular distance from the point to the segment; and the transition probability compares the driving distance between two candidate segments along the road graph with the straight-line distance between the two observations. Then Viterbi picks the most likely sequence over the whole trace. That fixes the flyover concretely: a point 4 metres from the surface road and 9 metres from the expressway wins on emission, but transitioning off the expressway and back requires exiting at a ramp and doubling back, perhaps 1.8 km of driving, in the 4 seconds between pings while the observations are 60 metres apart — a transition probability of essentially zero. Emission loses to transition, and one bad reading cannot derail a good trace. That is the entire advantage over point-wise snapping. The same machinery fixes the sibling cases: parallel service roads, dual carriageways, and multi-level interchanges. Practical additions I would make: keep candidate sets small with a radius cap so Viterbi stays cheap, use heading to down-weight candidates the vehicle is not aligned with, and for the live navigation case run an online variant with a short lookback window rather than waiting for the whole trace. And I would fix it urgently rather than cosmetically, because every downstream number — segment speeds, trip distance, fare, and ETA training labels — inherits this error.',
      isCaseBased: true,
    },
    {
      question: 'How do you serve the map picture itself? Raster versus vector tiles, and why are tiles such good CDN objects?',
      answer:
        'The world at zoom z is a 2^z by 2^z grid of tiles addressed by (z, x, y), so zoom 0 is one tile for the planet and zoom 20 is about 1.1 trillion possible tiles — you pre-render the popular ones and generate the rest on demand. **Raster tiles** are pre-rendered images, typically 256 pixels square: trivial for the client, but you need a separate rendered set per style, per language and per screen density, and labels are baked in so they cannot rotate or rescale smoothly. **Vector tiles** ship the geometry and attributes in a compact binary form and let the client do styling and label placement: one tile set serves every style, language and DPI, and you get smooth zoom, rotation, tilt and dark mode for free, at the cost of a much heavier client and real device CPU and GPU work. Modern products ship vector. **Why tiles are close to the ideal CDN object**: the URL is derived entirely from (z, x, y) plus a map-data version, the content is immutable for that version, there is no personalisation and nothing varies by auth, and access has enormous locality because a small set of tiles over cities serves the overwhelming majority of requests. So you set a one-year immutable cache header and put the **map version in the URL path** — a new map release becomes a new URL rather than an invalidation, because you cannot invalidate a trillion objects but you can change a key. Hit rates in the high nineties are normal, so the origin renderer only ever sees genuine long-tail misses. The framing I would end on is the **query mix**: viewport tiles are almost all of the request count and almost none of the backend cost because the CDN absorbs them; search and geocoding go to a completely different index; and route requests are the smallest count and by far the highest cost per request, so they are what the backend is actually sized for.',
      isCaseBased: false,
    },
    {
      question: 'Case: your ETA is well calibrated in your home market but 12 percent optimistic in a market you launched three months ago. What is going on, and what do you do?',
      answer:
        'The direction of the error is the clue. ETA errors from missing data are almost always **optimistic**, because the things you are missing are friction: unmapped turn restrictions, wrong one-ways, missing signals and stop signs, absent speed profiles, and thin probe coverage so live traffic falls back to free-flow assumptions. You do not accidentally model a road as slower than it is; you accidentally model it as emptier. So my first hypothesis is a data-quality gap, not a model gap. Diagnosis, in order: split every existing ETA metric by region — if the aggregate looked fine, that is itself the first bug, because a small market gets averaged away; then measure probe density per segment and the fraction of route time spent on segments with no historical profile; then compare predicted versus actual on trips that stay on well-covered arterials versus trips that use residential streets, which separates a data problem from a genuine model problem; and finally sample the worst-error routes and inspect them for missing restrictions, since a single wrong one-way can make a whole neighbourhood systematically wrong. Fixes, cheapest first: raise the road-class default speeds used as fallback in that market, calibrated on the trips you do have; add a **data-density feature** to the model so it can learn to be less confident and less optimistic where coverage is thin, and add a region-level bias correction as an interim; weight user reports and map edits heavily and prioritise ground-truth collection on the highest-traffic corridors; and derive missing geometry from imagery. The structural decision I would state is the tradeoff: one global model is cheap and mediocre everywhere, per-region models are excellent where data is thick and unusable where it is thin, and the workable answer is a global model with regional features plus a density-aware fallback — plus monitoring split by region permanently, so the next new market is visible on day one rather than three months in.',
      isCaseBased: true,
    },
    {
      question: 'Where does live traffic data come from, and what is the honest privacy story?',
      answer:
        'It comes from **anonymized speed probes**: phones running the app periodically report position and speed, the backend map-matches each trace onto road segments, and speeds are derived per segment. No roadside hardware, coverage everywhere you have users, and it compounds — more users means better traffic means more users, which is why incumbents are hard to displace. Aggregation matters more than it looks: per segment per short window, take a robust central estimate rather than a mean, since one device parked with the engine running or crawling in a car park skews an average badly; and require a **minimum number of distinct devices** before publishing a speed at all, falling back to the historical profile for that segment and time bucket when you are below it. On privacy, I would give the honest version rather than the reassuring one: this is location data about identifiable people, and "we anonymize it" is not by itself a true statement about location traces, because a trace with a home end and a work end is frequently uniquely identifying even without an id attached. The mitigations that actually do work are aggregation thresholds so nothing is published from too few devices, dropping the first and last portions of every trip before aggregation so origins and destinations never enter the pipeline, short retention on the serving path, and noise on low-count aggregates. Those reduce the risk; they do not eliminate it, and I would rather say that in an interview than claim it is solved. Then the systems consequence, which is the part people forget: the router is a **controller acting on the system it measures**. Send everyone around a jam and the alternative becomes the jam. So the traffic layer needs damping — split flow across near-equal alternatives rather than switching it wholesale, cap the share of traffic assignable to low-capacity residential roads, and route on predicted state at your arrival time rather than the current reading.',
      isCaseBased: false,
    },
    {
      question: 'Case: design the caching strategy for a maps backend. What is cacheable, what is not, and what would you never cache?',
      answer:
        'I would cache by request type, because the three types have completely different properties. **Tiles: cache aggressively, at the CDN, effectively forever.** The URL is (z, x, y) plus a map-data version, the content is immutable for that version, nothing is personalised and nothing varies by auth, and access locality is extreme because city tiles dominate. One-year immutable headers, map version in the path so a release is a new URL rather than a mass invalidation, and hit rates in the high nineties. This is the cheapest win in the entire system and it removes the largest request category from the backend. **Routes: cache carefully, and split the object.** Exact origin-destination pairs are near-unique so a naive route cache has a terrible hit rate — but the two halves of the answer have different lifetimes. The **path** for a popular corridor changes slowly and can be cached for minutes; the **ETA** for that path changes fast and should be recomputed every request. Cache the geometry, recompute the number. Alongside that, coarse **cell-pair travel times** for a time bucket cache well with a short TTL and cover a lot of "roughly how far" traffic. **Search and geocoding: cache the head, not the tail.** Popular queries in a region are extremely repetitive and cache well keyed by (normalised query, coarse location cell); the long tail does not, and should not be forced to. **What I would never cache**: an ETA without a short TTL, because a stale ETA is worse than a slow one — it is confidently wrong; anything keyed by a precise user location, because that is both a poor cache key and a privacy liability; and live traffic overlays for longer than their update window. I would also name the invalidation strategy explicitly, since that is the real question hiding here: **prefer versioned keys over invalidation everywhere.** Map version in the tile path, weight version in the routing servers, model version in the ETA service. Nothing gets purged; the key changes and the old entries age out. Cross-referencing the caching module: this is cache-aside for routes, immutable-versioned CDN objects for tiles, and TTL-bounded for anything derived from live data.',
      isCaseBased: true,
    },
    {
      question: 'How do one-way streets and turn restrictions live in the graph, and what do they cost you?',
      answer:
        'One-ways are the easy half: they are simply directed edges, which is why the road graph is directed. The cost shows up in bidirectional search and in contraction hierarchies, both of which need the **reverse** graph, so you either materialise it or derive it on the fly. Turn restrictions are the hard half, because "no left from Main onto Oak" is a property of a *pair* of edges and a node cannot express it — a node-based graph has no place to put it. Two standard treatments. **Edge-based expansion**: make each road segment a node and each permitted turn an edge. Restrictions then vanish into the graph structure (a forbidden turn is simply an absent edge), and you get a bonus — you can *price* turns, so a left across oncoming traffic costs more than a right, which is a real component of urban travel time. The price is size: the expansion multiplies the graph by roughly two to four times, and on a continental network that is the difference between comfortably RAM-resident and awkwardly so. **Turn tables**: keep the node-based graph and consult a per-node table of forbidden or costly transitions during expansion. Much smaller, but now every algorithm — Dijkstra, A-star, the CH contraction step, map matching — has to know about turn state, so correctness bugs hide in the corners. Most production routers take the edge-based expansion and pay the memory, because the correctness surface is smaller and turn costs come free. Two follow-ups worth pre-empting: **time-dependent restrictions** ("no left 8 to 11") mean the graph is a function of departure time, so the restriction lives in the customization or is evaluated at expansion; and restriction data quality is one of the biggest sources of bad routes in newly mapped regions, which ties directly back to why ETA is worse in new markets.',
      isCaseBased: false,
    },
  ],
  flashcards: [
    { front: 'Quadtree: mechanics and cost', back: 'Recursively split a square into 4 whenever a LEAF exceeds capacity; internal nodes hold no points, only route. Depth follows data density (empty quadrant stays depth 1, dense district hits depth 9). Costs: unbalanced with no depth bound (needs a floor), clusters straddling a midpoint split get torn across 4 subtrees (k-d tree splits at the median instead), structural churn under motion, and it indexes points only.' },
    { front: 'R-tree: the one thing point indexes cannot do', back: 'Indexes EXTENTS — roads, polygons, buildings — by their minimum bounding rectangles, grouped into parent MBRs, balanced like a B-tree. Query = descend into every intersecting MBR, then exact geometry test (filter-then-refine). Unlike a quadtree, siblings may OVERLAP, so insertion heuristics (least enlargement; R*-tree reinsertion) decide performance. This is what PostGIS/GiST uses.' },
    { front: 'S2 vs H3 — what each buys and what each costs', back: 'S2: sphere to cube to Hilbert curve to a 64-bit id, levels 0-30 (L12 about 5 km2, L16 about 0.02 km2). Hilbert never jumps, so a region needs fewer 1-D ranges than geohash Z-order; exact parent nesting and mixed-level covers. H3: hexagons, all 6 neighbours equidistant (a square has 4 at d and 4 at 1.41d), so ring expansion and per-cell smoothing are unbiased; res 8 about 0.74 km2, res 9 about 0.11 km2. Costs: 12 pentagons, and children only approximately fill the parent so you cannot roll up counts.' },
    { front: 'Picking a spatial index — four questions', back: '1) Points or extents? Extents force an R-tree (PostGIS). 2) Uniform or skewed density? Skewed + static = quadtree; skewed + moving = flat grid with per-region resolution. 3) Do neighbour distances matter (aggregation, smoothing, rings)? Then H3. 4) Need exact hierarchy or cheap range scans? Then S2. Otherwise geohash, and name what would push you off it.' },
    { front: 'The road network as data', back: 'Directed weighted graph: nodes = intersections, edges = segments. Weight is TIME, not distance, and is time-of-day dependent (speed profile per segment per time-of-day/weekday + live correction). One-ways = directed edges. Turn restrictions do not fit on an edge: expand to an edge-based graph (nodes = segments, edges = permitted turns, 2-4x bigger, but turn costs come free) or carry a turn table. Continental scale: ~10^8 directed edges, a couple of GB, held in RAM.' },
    { front: 'The routing ladder, with numbers', back: 'Dijkstra: explores a disc — Delhi to Mumbai is pi x 1400^2 = 6.2M km2 versus India\'s 3.3M, so essentially the whole country. A*: pop on g+h, h = great-circle / MAX speed; h must never overestimate (admissible) or you get a fast, quietly suboptimal route; h=0 IS Dijkstra; a few times faster. Bidirectional: 2 x pi(r/2)^2 = half the area; do NOT stop when frontiers touch. CH: contract unimportant nodes adding shortcut edges, query is an up-down bidirectional search, ~1,000 settled nodes and ~100 us. ALT: landmark distances give tighter admissible bounds. Hub labels: sub-microsecond, tens of GB.' },
    { front: 'The CH tradeoff, and the fix', back: 'Shortcut weights assume FIXED edge weights, so live traffic invalidates them — and you cannot rerun hours of preprocessing every 2 minutes. Fix: CRP-style split into a slow metric-INDEPENDENT partition (changes only when the map changes) plus a customization step that recomputes weights inside that partition in seconds. Preprocessing buys speed and costs freshness; CRP moves the point on that curve.' },
    { front: 'Why the graph ETA is wrong, and in which direction', back: 'Systematically OPTIMISTIC, not merely noisy: edge weights are free-flow, so signal waits, intersection queues, left turns across traffic, crossings and dwell time are all missing — and every one of them ADDS time. So predict the RESIDUAL over the routing baseline, train on completed trips (free perfect labels), and use an asymmetric loss because being late costs the user far more than being early.' },
    { front: 'Live traffic: source, privacy, and the loop', back: 'Anonymized speed probes from phones, map-matched to segments, aggregated per segment per short window with a robust estimator and a MINIMUM device count before publishing (below it, fall back to the historical profile). Privacy honestly: location traces are often uniquely identifying; thresholds, dropping trip start/end, short retention and noise reduce but do not eliminate the risk. And the router is a CONTROLLER acting on what it measures — route everyone around a jam and you create one, so split flow, cap low-capacity roads, and route on predicted state.' },
    { front: 'Map matching, and why nearest-road fails', back: 'GPS is +/-5 m open sky and 20-50 m in urban canyons — worst exactly where roads are densest. Nearest-road snapping breaks on flyovers, parallel service roads, dual carriageways and interchanges. Fix: an HMM — states = candidate segments per point, emission = Gaussian in perpendicular distance, transition = road distance between candidates versus straight-line gap between observations — then Viterbi over the whole trace, so one bad point cannot derail it. Everything downstream (segment speeds, distance, fare, ETA labels) depends on it.' },
  ],
  mindmapMarkdown: `- Case Study: Google Maps — Spatial Indexes, Routing & ETA
  - Prerequisite: geohash + 9-cell query (Uber case study)
  - Spatial index structures
    - Quadtree: a leaf splits on capacity, so depth follows density
    - Quadtree costs: unbalanced, midpoint splits, churn, points only
    - R-tree: MBR hierarchy, handles EXTENTS, siblings overlap, PostGIS
    - S2: cube, Hilbert curve (no jumps, fewer ranges), exact nesting
    - H3: hexagons, 6 equidistant neighbours (squares: 4 at d, 4 at 1.41d)
    - H3 caveats: 12 pentagons, children only approximately nest
    - Choosing: extents, density, neighbour bias, hierarchy
  - The map as a graph
    - Nodes = intersections, edges = segments, weight is TIME
    - One-ways directed; turn restrictions need edge-based expansion
    - ~10^8 edges per continent, RAM-resident
  - Routing
    - Dijkstra explores a disc: Delhi-Mumbai covers all of India
    - A* with great-circle / max speed; admissible or wrong routes
    - Bidirectional halves the area; do not stop on frontier touch
    - Contraction hierarchies: shortcuts, up-down search, ~100 us
    - CH cost: fixed weights, so CRP splits topology from metric
    - ALT landmarks; hub labeling
  - ETA
    - Optimistic graph baseline, so learn the residual from speed profiles, live traffic and incidents; asymmetric loss
  - Traffic and map matching
    - Anonymized probes, count thresholds, honest privacy limits
    - Feedback loop: routing around a jam creates one
    - HMM + Viterbi beats nearest-road at flyovers
  - Serving and tradeoffs
    - Tiles (z,x,y): vector, immutable, versioned URL, CDN; cache the path, recompute the ETA
    - Preprocessing vs freshness; coverage vs data quality`,
}

export default m
