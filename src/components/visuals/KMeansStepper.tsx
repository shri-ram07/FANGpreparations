import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS, CHART_SERIES } from './shell/colors'

type Pt = [number, number]
type InitKey = 'spread' | 'corner' | 'center'

function mulberry32(seed: number) {
  let a = seed
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 36 fixed points: 12 per gaussian blob, seeded — every visitor sees the same data.
const POINTS: Pt[] = (() => {
  const rand = mulberry32(7)
  const gauss = () => {
    const u = Math.max(rand(), 1e-9)
    const v = rand()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
  const blobs: Pt[] = [
    [120, 205],
    [300, 70],
    [480, 200],
  ]
  const pts: Pt[] = []
  for (const [bx, by] of blobs) {
    for (let i = 0; i < 12; i++) {
      pts.push([Math.min(585, Math.max(15, bx + gauss() * 30)), Math.min(268, Math.max(12, by + gauss() * 22))])
    }
  }
  return pts
})()

// Verified offline: at k=3 'spread' and 'center' reach the global minimum
// (inertia ≈ 62351, 12/12/12); 'corner' converges to inertia ≈ 336333 —
// two centroids split the left blob, one swallows the other two.
const INITS: Record<InitKey, { label: string; pts: Pt[] }> = {
  spread: { label: 'good spread', pts: [[70, 100], [200, 25], [540, 100], [560, 25]] },
  corner: { label: 'one corner', pts: [[25, 260], [60, 260], [25, 230], [60, 230]] },
  center: { label: 'all centered', pts: [[290, 130], [310, 150], [285, 155], [315, 128]] },
}

interface Frame {
  phase: 'assign' | 'update'
  assign: number[]
  centroids: Pt[]
  prev: Pt[] | null
  inertia: number
  converged: boolean
  note: string
}

const d2 = (p: Pt, c: Pt) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2
const sse = (assign: number[], cents: Pt[]) => POINTS.reduce((s, p, i) => s + d2(p, cents[assign[i]!]!), 0)

function simulate(k: number, init: InitKey): Frame[] {
  const frames: Frame[] = []
  let centroids = INITS[init].pts.slice(0, k).map((c): Pt => [c[0], c[1]])
  let prevAssign: number[] | null = null
  for (let iter = 1; iter <= 40; iter++) {
    const assign = POINTS.map((p) => {
      let best = 0
      for (let j = 1; j < k; j++) if (d2(p, centroids[j]!) < d2(p, centroids[best]!)) best = j
      return best
    })
    const inertia = sse(assign, centroids)
    const pa: number[] | null = prevAssign
    const converged = pa !== null && assign.every((a, i) => a === pa[i])
    frames.push({
      phase: 'assign',
      assign,
      centroids,
      prev: null,
      inertia,
      converged,
      note: converged
        ? `ASSIGN ${iter}: no point switched cluster — converged at inertia ${inertia.toFixed(0)}. A local minimum, not necessarily THE minimum.`
        : `ASSIGN ${iter}: every point joins its nearest centroid (thin lines show the membership).`,
    })
    if (converged) break
    const next = centroids.map((c, j): Pt => {
      const mine = POINTS.filter((_, i) => assign[i] === j)
      // ponytail: an empty cluster keeps its centroid in place; re-seeding is the production fix
      if (mine.length === 0) return c
      return [mine.reduce((s, p) => s + p[0], 0) / mine.length, mine.reduce((s, p) => s + p[1], 0) / mine.length]
    })
    const after = sse(assign, next)
    frames.push({
      phase: 'update',
      assign,
      centroids: next,
      prev: centroids,
      inertia: after,
      converged: false,
      note: `UPDATE ${iter}: each centroid jumps to its cluster's mean — inertia ${inertia.toFixed(0)} → ${after.toFixed(0)}.`,
    })
    centroids = next
    prevAssign = assign
  }
  return frames
}

const diamond = (x: number, y: number) => `M${x},${y - 9}L${x + 9},${y}L${x},${y + 9}L${x - 9},${y}Z`

export default function KMeansStepper({ k = 3 }: { k?: number }) {
  const [kk, setKk] = useState(k)
  const [init, setInit] = useState<InitKey>('spread')
  const frames = useMemo(() => simulate(kk, init), [kk, init])
  const stepper = useStepper(frames.length)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kk, init])

  const f = frames[stepper.step]!
  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-0.5 text-xs ${active ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`

  return (
    <InteractiveShell
      title="K-Means: assign, average, repeat"
      notice="Inertia only ever falls, but WHERE it lands depends on the start — the corner init converges happily to a 5x worse answer. K-Means finds A minimum, never THE minimum."
      onReset={() => {
        setKk(k)
        setInit('spread')
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">k:</span>
        {[2, 3, 4].map((n) => (
          <button key={n} onClick={() => setKk(n)} className={`${chip(n === kk)} font-mono`}>
            {n}
          </button>
        ))}
        <span className="mr-1 ml-3 text-xs text-ink-soft">init:</span>
        {(Object.keys(INITS) as InitKey[]).map((key) => (
          <button key={key} onClick={() => setInit(key)} className={chip(key === init)}>
            {INITS[key].label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 280" className="h-auto w-full select-none">
        {/* assignment lines (ASSIGN frames only) */}
        {f.phase === 'assign' &&
          POINTS.map((p, i) => {
            const c = f.centroids[f.assign[i]!]!
            return (
              <line key={i} x1={p[0]} y1={p[1]} x2={c[0]} y2={c[1]} stroke={CHART_SERIES[f.assign[i]!]} strokeWidth={1} opacity={0.25} />
            )
          })}

        {/* points, colored by current cluster */}
        {POINTS.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={4} fill={CHART_SERIES[f.assign[i]!]} opacity={0.85} />
        ))}

        {/* ghosted previous centroids + movement arrows (UPDATE frames) */}
        {f.prev !== null &&
          f.prev.map((c, j) => {
            const n = f.centroids[j]!
            const dx = n[0] - c[0]
            const dy = n[1] - c[1]
            const len = Math.hypot(dx, dy)
            if (len < 2) return <path key={j} d={diamond(c[0], c[1])} fill={CHART_SERIES[j]} opacity={0.25} />
            const ux = dx / len
            const uy = dy / len
            const tx = n[0] - ux * 13 // stop the arrow short of the diamond
            const ty = n[1] - uy * 13
            return (
              <g key={j}>
                <path d={diamond(c[0], c[1])} fill={CHART_SERIES[j]} opacity={0.25} />
                <line x1={c[0]} y1={c[1]} x2={tx} y2={ty} stroke={CHART_SERIES[j]} strokeWidth={1.5} opacity={0.6} />
                <polygon
                  points={`${tx},${ty} ${tx - ux * 7 - uy * 4},${ty - uy * 7 + ux * 4} ${tx - ux * 7 + uy * 4},${ty - uy * 7 - ux * 4}`}
                  fill={CHART_SERIES[j]}
                  opacity={0.6}
                />
              </g>
            )
          })}

        {/* centroids: diamond with white ring + mono label */}
        {f.centroids.map((c, j) => (
          <g key={j}>
            <path d={diamond(c[0], c[1])} fill={CHART_SERIES[j]} stroke="#FFFFFF" strokeWidth={2} />
            <text x={c[0] + 12} y={c[1] - 8} fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill="#17191E">
              c{j + 1}
            </text>
          </g>
        ))}

        <text x={592} y={16} textAnchor="end" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
          inertia = {f.inertia.toFixed(0)}
        </text>
      </svg>

      <p className={`my-2 min-h-10 font-mono text-[13px] ${f.converged ? 'text-correct' : 'text-ink'}`}>{f.note}</p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
