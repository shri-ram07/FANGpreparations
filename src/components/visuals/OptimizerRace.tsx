import { useEffect, useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS, CHART_SERIES } from './shell/colors'

// Anisotropic quadratic ravine: gentle along x, brutally steep along y.
// Condition number 90 — exactly the shape that makes plain GD zigzag.
const W = 600
const H = 320
const X_MIN = -1.5
const X_MAX = 1.5
const Y_MIN = -0.8
const Y_MAX = 0.8
const K = 90
const START: readonly [number, number] = [-1.25, 0.6]
const STEPS = 70

const f = (x: number, y: number) => 0.5 * (x * x + K * y * y)
const px = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * W
const py = (y: number) => H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * H

interface Traj {
  pts: [number, number][]
  divergedAt: number | null
}

function run(kind: 'sgd' | 'momentum' | 'adam', lr: number): Traj {
  const pts: [number, number][] = [[START[0], START[1]]]
  let [x, y] = START
  let vx = 0
  let vy = 0
  let mx = 0
  let my = 0
  let sx = 0
  let sy = 0
  for (let t = 1; t <= STEPS; t++) {
    const gx = x
    const gy = K * y
    if (kind === 'sgd') {
      x -= lr * gx
      y -= lr * gy
    } else if (kind === 'momentum') {
      vx = 0.9 * vx + gx
      vy = 0.9 * vy + gy
      x -= lr * vx
      y -= lr * vy
    } else {
      mx = 0.9 * mx + 0.1 * gx
      my = 0.9 * my + 0.1 * gy
      sx = 0.999 * sx + 0.001 * gx * gx
      sy = 0.999 * sy + 0.001 * gy * gy
      const c1 = 1 - 0.9 ** t
      const c2 = 1 - 0.999 ** t
      x -= (lr * (mx / c1)) / (Math.sqrt(sx / c2) + 1e-8)
      y -= (lr * (my / c1)) / (Math.sqrt(sy / c2) + 1e-8)
    }
    if (!isFinite(x) || !isFinite(y) || Math.abs(x) > 1e6 || Math.abs(y) > 1e6) {
      const last = pts[pts.length - 1]!
      while (pts.length <= STEPS) pts.push(last)
      return { pts, divergedAt: t }
    }
    pts.push([x, y])
  }
  return { pts, divergedAt: null }
}

const OPTS = [
  { name: 'SGD', color: CHART_SERIES[0], dx: 10, dy: -8, anchor: 'start' as const },
  { name: 'Momentum', color: CHART_SERIES[1], dx: 10, dy: 18, anchor: 'start' as const },
  { name: 'Adam', color: CHART_SERIES[2], dx: -10, dy: -8, anchor: 'end' as const },
]

const clampX = (v: number) => Math.max(-30, Math.min(W + 30, v))
const clampY = (v: number) => Math.max(-30, Math.min(H + 30, v))
const fmt = (v: number) => (v >= 1e4 ? v.toExponential(1) : v.toFixed(3))

export default function OptimizerRace() {
  const [lr, setLr] = useState(0.02)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const trajs = useMemo(() => [run('sgd', lr), run('momentum', lr), run('adam', lr)], [lr])
  const stepper = useStepper(STEPS + 1, 140)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lr])

  // Contour background painted once — the surface never changes, only the walkers.
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const block = 2
    const vals: number[] = []
    for (let j = 0; j < H; j += block)
      for (let i = 0; i < W; i += block)
        vals.push(f(X_MIN + ((i + 1) / W) * (X_MAX - X_MIN), Y_MAX - ((j + 1) / H) * (Y_MAX - Y_MIN)))
    const sorted = [...vals].sort((a, b) => a - b)
    const bands = 7
    const thresholds: number[] = []
    for (let b = 1; b < bands; b++) thresholds.push(sorted[Math.floor((sorted.length * b) / bands)]!)
    ctx.clearRect(0, 0, W, H)
    let k = 0
    for (let j = 0; j < H; j += block)
      for (let i = 0; i < W; i += block) {
        const v = vals[k++]!
        let band = 0
        while (band < bands - 1 && v > thresholds[band]!) band++
        ctx.fillStyle = `rgba(36,80,229,${(0.05 + (0.3 * band) / (bands - 1)).toFixed(3)})`
        ctx.fillRect(i, j, block, block)
      }
  }, [])

  return (
    <InteractiveShell
      title="Three optimizers, one ravine"
      notice="Same landscape, same learning rate — SGD zigzags the ravine wall, momentum plows through the oscillation, Adam rescales each axis and walks in. Three personalities, one gradient."
      onReset={() => {
        setLr(0.02)
        reset()
      }}
    >
      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="block h-auto w-full" />
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full select-none">
          {/* minimum */}
          <path d={`M${W / 2 - 5},${H / 2 - 5}L${W / 2 + 5},${H / 2 + 5}M${W / 2 - 5},${H / 2 + 5}L${W / 2 + 5},${H / 2 - 5}`} stroke="#17191E" strokeWidth={1.5} />
          <text x={W / 2} y={H / 2 + 20} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
            min
          </text>

          {OPTS.map((o, oi) => {
            const t = trajs[oi]!
            const upto = t.pts.slice(0, stepper.step + 1)
            const head = upto[upto.length - 1]!
            const hx = Math.max(8, Math.min(W - 8, px(head[0])))
            const hy = Math.max(8, Math.min(H - 8, py(head[1])))
            return (
              <g key={o.name}>
                <polyline
                  points={upto.map(([wx, wy]) => `${clampX(px(wx)).toFixed(1)},${clampY(py(wy)).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={o.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  opacity={0.85}
                />
                <circle cx={hx} cy={hy} r={4} fill={o.color} stroke="#FFFFFF" strokeWidth={2} />
                <circle cx={hx + o.dx} cy={hy + o.dy - 3.5} r={2.5} fill={o.color} />
                <text
                  x={hx + o.dx + (o.anchor === 'start' ? 6 : -6)}
                  y={hy + o.dy}
                  textAnchor={o.anchor}
                  fontSize={11}
                  fill="#17191E"
                >
                  {o.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-ink-soft">learning rate</span>
        <input type="range" min={0.001} max={0.05} step={0.001} value={lr} onChange={(e) => setLr(Number(e.target.value))} className="w-full accent-accent" />
        <span className="w-12 text-right font-mono text-sm">{lr.toFixed(3)}</span>
      </div>

      <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs">
        <span className="text-ink-soft">
          step {stepper.step}/{STEPS}
        </span>
        {OPTS.map((o, oi) => {
          const t = trajs[oi]!
          const [wx, wy] = t.pts[stepper.step]!
          const diverged = t.divergedAt !== null && stepper.step >= t.divergedAt
          return (
            <span key={o.name} className="flex items-center gap-1.5 text-ink">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: o.color }} />
              {o.name} f={diverged ? <span className="text-wrong">diverged</span> : fmt(f(wx, wy))}
            </span>
          )
        })}
      </div>

      <StepControls stepper={stepper} total={STEPS + 1} />
    </InteractiveShell>
  )
}
