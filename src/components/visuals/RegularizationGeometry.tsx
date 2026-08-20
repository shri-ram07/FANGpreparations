import { useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

// The picture the plan asks for by name: why L1 zeroes weights and L2 does not.
// Loss contours are ellipses around the OLS solution; the penalty region is a
// diamond (L1) or a disc (L2). The constrained optimum is where the smallest
// contour first touches the region — on an axis for the diamond (corner),
// almost never for the disc.
const W = 600
const H = 340
const CX = 250
const CY = 170
const U = 46 // px per unit

const px = (x: number) => CX + x * U
const py = (y: number) => CY - y * U

// OLS optimum (unpenalised least-squares solution)
const OLS: [number, number] = [2.6, 1.15]
// Elongated, tilted loss contours — correlated features, the realistic case
const A = 1.0
const B = 2.6
const THETA = -0.62

// loss at (x, y): quadratic form centred on OLS, rotated by THETA
function loss(x: number, y: number) {
  const dx = x - OLS[0]
  const dy = y - OLS[1]
  const c = Math.cos(THETA)
  const s = Math.sin(THETA)
  const u = c * dx + s * dy
  const v = -s * dx + c * dy
  return A * u * u + B * v * v
}

// Walk the boundary of the penalty region, return the point of least loss.
function touchPoint(kind: 'l1' | 'l2', t: number) {
  let best: [number, number] = [0, 0]
  let bestLoss = Infinity
  const N = 2000
  for (let i = 0; i < N; i++) {
    const a = (2 * Math.PI * i) / N
    let p: [number, number]
    if (kind === 'l2') p = [t * Math.cos(a), t * Math.sin(a)]
    else {
      // diamond |x| + |y| = t, parameterised by angle
      const c = Math.cos(a)
      const s = Math.sin(a)
      const k = t / (Math.abs(c) + Math.abs(s))
      p = [k * c, k * s]
    }
    const l = loss(p[0], p[1])
    if (l < bestLoss) {
      bestLoss = l
      best = p
    }
  }
  return best
}

const ellipse = (level: number) => {
  const pts: string[] = []
  for (let i = 0; i <= 120; i++) {
    const a = (2 * Math.PI * i) / 120
    // point on the unit circle in (u,v) space, scaled by the axis lengths
    const u = Math.sqrt(level / A) * Math.cos(a)
    const v = Math.sqrt(level / B) * Math.sin(a)
    const c = Math.cos(THETA)
    const s = Math.sin(THETA)
    const dx = c * u - s * v
    const dy = s * u + c * v
    pts.push(`${px(OLS[0] + dx).toFixed(1)},${py(OLS[1] + dy).toFixed(1)}`)
  }
  return `M${pts.join('L')}Z`
}

export default function RegularizationGeometry({ kind: kind0 = 'l1' as 'l1' | 'l2' }) {
  const [kind, setKind] = useState<'l1' | 'l2'>(kind0)
  // Default budget is deliberately in the corner-solution range (<= 0.8), so the
  // headline lesson is visible before the reader touches anything.
  const [t, setT] = useState(0.7)

  const hit = useMemo(() => touchPoint(kind, t), [kind, t])
  const hitLoss = loss(hit[0], hit[1])
  const zeroed = Math.abs(hit[1]) < 0.045 || Math.abs(hit[0]) < 0.045

  const region =
    kind === 'l2'
      ? `M${px(t)},${py(0)} A${t * U},${t * U} 0 1 0 ${px(-t)},${py(0)} A${t * U},${t * U} 0 1 0 ${px(t)},${py(0)}Z`
      : `M${px(t)},${py(0)}L${px(0)},${py(t)}L${px(-t)},${py(0)}L${px(0)},${py(-t)}Z`

  return (
    <InteractiveShell
      title="Why L1 zeroes weights and L2 does not"
      notice="Shrink the budget and watch WHERE the contour first touches. The diamond has corners sitting on the axes, so the touch point lands on one — w₂ becomes exactly 0. The circle has no corners, so both weights stay small but non-zero."
      onReset={() => {
        setKind(kind0)
        setT(0.7)
      }}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['l1', 'l2'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              k === kind ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {k === 'l1' ? 'L1 / Lasso (diamond)' : 'L2 / Ridge (circle)'}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none">
        {/* grid + axes */}
        {[-2, -1, 0, 1, 2, 3, 4].map((i) => (
          <line key={`v${i}`} x1={px(i)} y1={0} x2={px(i)} y2={H} stroke={CHART_GRID} strokeWidth={1} />
        ))}
        {[-2, -1, 0, 1, 2, 3].map((i) => (
          <line key={`h${i}`} x1={0} y1={py(i)} x2={W} y2={py(i)} stroke={CHART_GRID} strokeWidth={1} />
        ))}
        <line x1={0} y1={py(0)} x2={W} y2={py(0)} stroke={CHART_AXIS} strokeWidth={1.25} />
        <line x1={px(0)} y1={0} x2={px(0)} y2={H} stroke={CHART_AXIS} strokeWidth={1.25} />
        <text x={W - 8} y={py(0) - 7} textAnchor="end" fontSize={11} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
          w₁
        </text>
        <text x={px(0) + 7} y={14} fontSize={11} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
          w₂
        </text>

        {/* loss contours around the OLS optimum */}
        {[0.35, 1.1, 2.2, 3.8, 5.8].map((lv) => (
          <path key={lv} d={ellipse(lv)} fill="none" stroke="#5A5F6A" strokeWidth={1} opacity={0.32} />
        ))}
        <path d={ellipse(hitLoss)} fill="none" stroke="#17191E" strokeWidth={2} />

        {/* penalty region */}
        <path d={region} fill="#2450E5" fillOpacity={0.12} stroke="#2450E5" strokeWidth={1.75} />

        {/* OLS optimum */}
        <circle cx={px(OLS[0])} cy={py(OLS[1])} r={4} fill="#5A5F6A" />
        <text x={px(OLS[0]) + 9} y={py(OLS[1]) + 4} fontSize={10.5} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
          OLS (no penalty)
        </text>

        {/* the touch point */}
        <circle cx={px(hit[0])} cy={py(hit[1])} r={6} fill={zeroed ? '#178A50' : '#B45309'} stroke="#fff" strokeWidth={2} />
        <text
          x={px(hit[0]) + 11}
          y={py(hit[1]) - 8}
          fontSize={10.5}
          fill={zeroed ? '#178A50' : '#B45309'}
          fontFamily="JetBrains Mono, monospace"
        >
          {zeroed ? 'on the axis: w₂ = 0' : 'off-axis: both non-zero'}
        </text>
      </svg>

      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-ink-soft">budget</span>
        <input
          type="range"
          min={0.25}
          max={3}
          step={0.05}
          value={t}
          onChange={(e) => setT(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <span className="w-10 text-right font-mono text-sm">{t.toFixed(2)}</span>
      </div>
      <p className="mt-1 font-mono text-[13px]">
        w = ({hit[0].toFixed(2)}, {hit[1].toFixed(2)}) ·{' '}
        <span style={{ color: zeroed ? '#178A50' : '#B45309' }}>
          {zeroed ? 'a weight was driven to exactly zero — feature selection' : 'both weights shrunk, neither eliminated'}
        </span>
      </p>
      <p className="mt-1 text-[13px] text-ink-soft">
        Smaller budget = stronger penalty (bigger λ). At this budget L1 sits on the corner. Switch to L2 without
        moving the slider and watch the touch point slide off the axis — same budget, same data, both weights survive.
        Then slide the budget up: the penalty weakens and even L1 eventually lets w₂ back in.
      </p>
    </InteractiveShell>
  )
}
