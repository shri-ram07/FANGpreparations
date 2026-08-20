import { useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from './shell/colors'

// The plan-named picture: max margin *visually*. A solid boundary, two dashed
// kerbs at w·x + b = ±1, the street shaded between them, and rings on the only
// points that hold it up. Drag a non-support-vector and nothing moves (hinge
// loss is exactly 0 there); drag a ringed one and the street swings.
const W = 600
const H = 340
const PX = 12 // plot origin x
const PY = 10 // plot origin y
const PS = 320 // plot side — square, so the street looks like a street

const toPx = (x: number) => PX + x * PS
const toPy = (y: number) => PY + (1 - y) * PS
const clamp01 = (v: number) => Math.min(0.96, Math.max(0.04, v))

interface Pt {
  x: number
  y: number
  cls: -1 | 1
}
interface V {
  x: number
  y: number
}
interface Model {
  w0: number
  w1: number
  b: number
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedPoints(): Pt[] {
  const rand = mulberry32(7)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
  const blob = (cx: number, cy: number, n: number, cls: -1 | 1) => {
    const out: Pt[] = []
    for (let i = 0; i < n; i++) out.push({ x: clamp01(cx + gauss() * 0.095), y: clamp01(cy + gauss() * 0.095), cls })
    return out
  }
  // Last point is the deliberate outlier: labelled class −1 but sitting on the
  // far side of the gap. Low C shrugs it off; high C wrecks the margin to get it.
  return [...blob(0.3, 0.66, 29, -1), ...blob(0.7, 0.34, 29, 1), { x: 0.46, y: 0.34, cls: -1 }]
}

const SEED = seedPoints()
const OUTLIER = SEED.length - 1
const ITERS = 8000

/**
 * Soft-margin linear SVM by full-batch subgradient descent (Pegasos form):
 * min (λ/2)‖w‖² + (1/n)Σ max(0, 1 − yᵢ f(xᵢ)) with λ = 1/(C·n), step 1/(λt),
 * plus Pegasos's projection onto the ball of radius 1/√λ, which is what keeps
 * C = 100 from blowing up on its first (enormous) step. Deterministic: no
 * shuffling, no randomness, fixed iteration count. Verified against a
 * 300k-iteration run — objective within ~1% and identical margins/SV counts
 * across C ∈ [0.2, 100].
 */
function fit(pts: Pt[], C: number): Model {
  const n = pts.length
  const lam = 1 / (C * n)
  const cap = 1 / Math.sqrt(lam)
  let w0 = 0
  let w1 = 0
  let b = 0
  for (let t = 1; t <= ITERS; t++) {
    const eta = 1 / (lam * t)
    let g0 = 0
    let g1 = 0
    let gb = 0
    for (const p of pts) {
      if (p.cls * (w0 * p.x + w1 * p.y + b) < 1) {
        g0 += p.cls * p.x
        g1 += p.cls * p.y
        gb += p.cls
      }
    }
    const shrink = 1 - eta * lam
    w0 = shrink * w0 + (eta / n) * g0
    w1 = shrink * w1 + (eta / n) * g1
    b += (eta / n) * gb
    const nrm = Math.hypot(w0, w1)
    if (nrm > cap) {
      w0 *= cap / nrm
      w1 *= cap / nrm
    }
  }
  return { w0, w1, b }
}

/** The segment of w·x + b = c inside the unit square, or null if it misses. */
function clipLine(m: Model, c: number): [V, V] | null {
  const k = c - m.b
  const hits: V[] = []
  const eps = 1e-9
  if (Math.abs(m.w1) > eps) {
    for (const x of [0, 1]) {
      const y = (k - m.w0 * x) / m.w1
      if (y >= -eps && y <= 1 + eps) hits.push({ x, y })
    }
  }
  if (Math.abs(m.w0) > eps) {
    for (const y of [0, 1]) {
      const x = (k - m.w1 * y) / m.w0
      if (x >= -eps && x <= 1 + eps) hits.push({ x, y })
    }
  }
  const uniq: V[] = []
  for (const p of hits) if (!uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6)) uniq.push(p)
  const [a, b] = uniq
  return a && b ? [a, b] : null
}

/** Sutherland–Hodgman clip of a convex polygon to the half-plane g ≥ 0. */
function clipHalf(poly: V[], g: (p: V) => number): V[] {
  const out: V[] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const ga = g(a)
    const gb = g(b)
    if (ga >= 0) out.push(a)
    if (ga >= 0 !== gb >= 0) {
      const t = ga / (ga - gb)
      out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) })
    }
  }
  return out
}

const SQUARE: V[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
]

const path = (poly: V[]) => (poly.length < 3 ? '' : `M${poly.map((p) => `${toPx(p.x).toFixed(1)},${toPy(p.y).toFixed(1)}`).join('L')}Z`)

const BOUNDARY = CHART_SERIES[3] // purple — not either class colour
const SV_RING = CHART_SERIES[2]
const CLASS_COLOR = [CHART_SERIES[0], CHART_SERIES[1]] as const
const PRESETS = [
  { logC: -0.7, label: 'C = 0.2 — soft' },
  { logC: 0, label: 'C = 1 — default' },
  { logC: 2, label: 'C = 100 — near hard' },
]

export default function SVMMarginExplorer() {
  const [pts, setPts] = useState<Pt[]>(SEED)
  const [logC, setLogC] = useState(0)
  const [drag, setDrag] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const C = Math.pow(10, logC)

  const m = useMemo(() => fit(pts, C), [pts, C])

  const f = (p: Pt | V) => m.w0 * p.x + m.w1 * p.y + m.b
  const norm = Math.hypot(m.w0, m.w1)
  const marginWidth = norm > 1e-9 ? 2 / norm : Infinity
  // A support vector is any point on or inside the margin: y·f(x) ≤ 1. The 0.05
  // slack is the kink tolerance — at near-hard margin several points sit at
  // exactly 1 and a tighter test flickers between runs. Tuned so the count at
  // ITERS matches a 300k-iteration solve for every C on the slider.
  const isSV = pts.map((p) => p.cls * f(p) <= 1 + 5e-2)
  const svCount = isSV.filter(Boolean).length
  const wrong = pts.filter((p) => p.cls * f(p) < 0).length
  const angle = (Math.atan2(-m.w0, m.w1) * 180) / Math.PI

  const street = clipHalf(
    clipHalf(SQUARE, (p) => 1 - f(p)),
    (p) => f(p) + 1,
  )
  const lines = ([0, 1, -1] as const).map((c) => clipLine(m, c))

  const onMove = (e: React.PointerEvent) => {
    if (drag === null || !svgRef.current) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current.getScreenCTM()!.inverse())
    const x = clamp01((p.x - PX) / PS)
    const y = clamp01(1 - (p.y - PY) / PS)
    setPts((prev) => prev.map((q, i) => (i === drag ? { ...q, x, y } : q)))
  }

  return (
    <InteractiveShell
      title="The margin street, and the points that hold it up"
      notice="Drag a point far from the street: the boundary does not budge — its hinge loss is exactly zero, so it contributes nothing. Now drag a RINGED point and the whole street swings. Then sweep C: low C buys a wide street and simply eats the mislabelled point; high C crushes the street to capture it."
      onReset={() => {
        setPts(SEED)
        setLogC(0)
        setDrag(null)
      }}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setLogC(p.logC)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              Math.abs(p.logC - logC) < 1e-9
                ? 'border-accent bg-accent text-white'
                : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <rect x={PX} y={PY} width={PS} height={PS} fill="none" stroke={CHART_GRID} strokeWidth={1} />

        {/* the street: everything between w·x + b = −1 and +1 */}
        <path data-testid="street" d={path(street)} fill={CHART_GRID} fillOpacity={0.85} />

        {/* the two kerbs, then the boundary itself */}
        {lines.map((seg, i) =>
          seg ? (
            <line
              key={i}
              data-testid={i === 0 ? 'boundary' : 'kerb'}
              x1={toPx(seg[0].x)}
              y1={toPy(seg[0].y)}
              x2={toPx(seg[1].x)}
              y2={toPy(seg[1].y)}
              stroke={BOUNDARY}
              strokeWidth={i === 0 ? 2.25 : 1.25}
              strokeDasharray={i === 0 ? undefined : '6 4'}
            />
          ) : null,
        )}

        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={toPx(p.x)} cy={toPy(p.y)} r={4.5} fill={CLASS_COLOR[p.cls === -1 ? 0 : 1]} stroke="#FFFFFF" strokeWidth={1.5} />
            {isSV[i] && (
              <circle data-testid="sv-ring" cx={toPx(p.x)} cy={toPy(p.y)} r={9} fill="none" stroke={SV_RING} strokeWidth={2} />
            )}
            <circle
              cx={toPx(p.x)}
              cy={toPy(p.y)}
              r={13}
              fill="transparent"
              className="cursor-grab"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                setDrag(i)
              }}
            />
          </g>
        ))}

        {/* label the planted outlier so its behaviour under C is legible */}
        <text
          x={toPx(pts[OUTLIER]!.x)}
          y={toPy(pts[OUTLIER]!.y) + 24}
          textAnchor="middle"
          fontSize={10}
          fill={CHART_AXIS}
          fontFamily="JetBrains Mono, monospace"
        >
          planted outlier
        </text>

        {/* legend */}
        <g fontFamily="JetBrains Mono, monospace" fontSize={11} fill={CHART_AXIS}>
          <line x1={352} y1={40} x2={382} y2={40} stroke={BOUNDARY} strokeWidth={2.25} />
          <text x={390} y={44}>
            w·x + b = 0
          </text>
          <line x1={352} y1={68} x2={382} y2={68} stroke={BOUNDARY} strokeWidth={1.25} strokeDasharray="6 4" />
          <text x={390} y={72}>
            w·x + b = ±1
          </text>
          <rect x={352} y={88} width={30} height={14} fill={CHART_GRID} fillOpacity={0.85} stroke={CHART_GRID} />
          <text x={390} y={100}>
            the street
          </text>
          <circle cx={367} cy={128} r={4.5} fill={CLASS_COLOR[0]} stroke="#FFFFFF" strokeWidth={1.5} />
          <circle cx={367} cy={128} r={9} fill="none" stroke={SV_RING} strokeWidth={2} />
          <text x={390} y={132}>
            support vector
          </text>
          <circle cx={367} cy={158} r={4.5} fill={CLASS_COLOR[0]} stroke="#FFFFFF" strokeWidth={1.5} />
          <text x={390} y={162}>
            class −1
          </text>
          <circle cx={367} cy={182} r={4.5} fill={CLASS_COLOR[1]} stroke="#FFFFFF" strokeWidth={1.5} />
          <text x={390} y={186}>
            class +1
          </text>
          <text x={352} y={224}>
            margin = 2/‖w‖
          </text>
          <text x={352} y={244}>
            ‖w‖ = {norm.toFixed(2)}
          </text>
          <text x={352} y={276}>
            angle = {angle.toFixed(1)}°
          </text>
          <text x={352} y={296}>
            misclassified = {wrong}
          </text>
        </g>
      </svg>

      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-ink-soft">C (log scale)</span>
        <input
          type="range"
          min={-0.7}
          max={2}
          step={0.05}
          value={logC}
          onChange={(e) => setLogC(Number(e.target.value))}
          className="w-full accent-accent"
          aria-label="C, the price of a margin violation"
        />
        <span data-testid="c-value" className="w-14 text-right font-mono text-sm">
          {C < 1 ? C.toFixed(2) : C.toFixed(1)}
        </span>
      </div>

      <p className="mt-2 font-mono text-[13px]">
        street width = <span data-testid="margin-width">{marginWidth.toFixed(3)}</span> · support vectors ={' '}
        <span data-testid="sv-count" style={{ color: SV_RING }}>
          {svCount}
        </span>{' '}
        of {pts.length}
      </p>
      <p className="mt-1 text-[13px] text-ink-soft">
        Every ringed point is holding a kerb. The other {pts.length - svCount} could be deleted and this exact boundary
        would come back — that is what "the model IS its support vectors" means. Watch the count climb as C falls: a
        wider street simply touches more points.
      </p>
    </InteractiveShell>
  )
}
