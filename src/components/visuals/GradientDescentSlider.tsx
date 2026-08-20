import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

type FnKey = 'quadratic' | 'nonconvex'

const FNS: Record<
  FnKey,
  { label: string; domain: [number, number]; start: number; f: (w: number) => number; df: (w: number) => number }
> = {
  quadratic: {
    label: 'Bowl (convex)',
    domain: [-6, 8],
    start: -5,
    f: (w) => 0.3 * (w - 2) ** 2 + 0.5,
    df: (w) => 0.6 * (w - 2),
  },
  nonconvex: {
    label: 'Two valleys (non-convex)',
    domain: [-5, 5],
    start: -4.4,
    f: (w) => 0.02 * w ** 4 - 0.25 * w ** 2 + 0.1 * w + 2,
    df: (w) => 0.08 * w ** 3 - 0.5 * w + 0.1,
  },
}

const STEPS = 24
const L = 46
const R = 572
const T = 14
const B = 250

function descend(key: FnKey, lr: number): number[] {
  const { f, df, start, domain } = FNS[key]
  const ws = [start]
  let w = start
  for (let i = 0; i < STEPS; i++) {
    w = w - lr * df(w)
    ws.push(w)
    if (!isFinite(f(w)) || Math.abs(w) > (domain[1] - domain[0]) * 4) break
  }
  return ws
}

export default function GradientDescentSlider({ fn = 'quadratic' }: { fn?: FnKey }) {
  const [key, setKey] = useState<FnKey>(fn)
  const [lr, setLr] = useState(0.6)
  const cfg = FNS[key]

  const path = useMemo(() => descend(key, lr), [key, lr])
  const stepper = useStepper(path.length, 450)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, lr])

  const [d0, d1] = cfg.domain
  // y-scale over the curve within the domain (ball can leave the plot — that IS divergence)
  const samples = useMemo(() => {
    const pts: [number, number][] = []
    for (let i = 0; i <= 240; i++) pts.push([d0 + ((d1 - d0) * i) / 240, 0])
    let max = -Infinity
    let min = Infinity
    for (const p of pts) {
      p[1] = cfg.f(p[0])
      max = Math.max(max, p[1])
      min = Math.min(min, p[1])
    }
    return { pts, min, max }
  }, [cfg, d0, d1])

  const px = (w: number) => L + ((w - d0) / (d1 - d0)) * (R - L)
  const py = (j: number) => B - ((j - samples.min) / (samples.max - samples.min)) * (B - T)

  const w = path[stepper.step]!
  const jw = cfg.f(w)
  const grad = cfg.df(w)
  const next = stepper.step + 1 < path.length ? path[stepper.step + 1]! : null
  const offPlot = w < d0 || w > d1

  // regime label from the whole path
  const regime = useMemo(() => {
    const last = path[path.length - 1]!
    if (Math.abs(last) > Math.abs(d0) + Math.abs(d1)) return { text: 'diverging — loss explodes', color: '#D33A2C' }
    let flips = 0
    for (let i = 2; i < path.length; i++) {
      const a = path[i]! - path[i - 1]!
      const b = path[i - 1]! - path[i - 2]!
      if (a * b < 0) flips++
    }
    if (flips > path.length / 3) return { text: 'overshooting — jumping across the valley', color: '#B45309' }
    const progress = Math.abs(path[0]! - last)
    if (progress < Math.abs(d1 - d0) * 0.08) return { text: 'crawling — lr too small', color: '#5A5F6A' }
    return { text: 'descending steadily', color: '#178A50' }
  }, [path, d0, d1])

  const curveD = useMemo(
    () => `M${samples.pts.map(([x, j]) => `${px(x).toFixed(1)},${py(j).toFixed(1)}`).join('L')}`,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [samples],
  )

  return (
    <InteractiveShell
      title="Walking downhill, blindfolded"
      notice="Set lr around 0.5 and play — smooth descent. Now push lr past 3 — the ball jumps ACROSS the valley and climbs out. When training loss explodes, this is what is happening."
      onReset={() => {
        setKey(fn)
        setLr(0.6)
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(FNS) as FnKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setKey(k)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              k === key ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {FNS[k].label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 286" className="h-auto w-full select-none">
        {/* recessive grid + axes */}
        <line x1={L} y1={B} x2={R} y2={B} stroke={CHART_GRID} />
        <text x={(L + R) / 2} y={B + 26} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          w (the weight we are tuning)
        </text>
        <text x={14} y={(T + B) / 2} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS} transform={`rotate(-90 14 ${(T + B) / 2})`}>
          loss J(w)
        </text>

        {/* the loss curve */}
        <path d={curveD} fill="none" stroke="#17191E" strokeWidth={2} opacity={0.85} />

        {/* trail */}
        {path.slice(0, stepper.step + 1).map((pw, i) => {
          if (pw < d0 || pw > d1) return null
          return (
            <circle
              key={i}
              cx={px(pw)}
              cy={py(cfg.f(pw))}
              r={3}
              fill="#2450E5"
              opacity={0.15 + (0.5 * i) / Math.max(stepper.step, 1)}
            />
          )
        })}

        {/* the jump to the next position */}
        {next !== null && !offPlot && next >= d0 && next <= d1 && (
          <line
            x1={px(w)}
            y1={py(jw)}
            x2={px(next)}
            y2={py(cfg.f(next))}
            stroke="#2450E5"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.7}
          />
        )}

        {/* the ball */}
        {offPlot ? (
          <text x={w < d0 ? L + 8 : R - 8} y={T + 16} textAnchor={w < d0 ? 'start' : 'end'} fontSize={11} fill="#D33A2C" fontFamily="JetBrains Mono, monospace">
            ← w flew off the chart
          </text>
        ) : (
          <circle cx={px(w)} cy={py(jw)} r={7} fill="#2450E5" stroke="#fff" strokeWidth={2} />
        )}
      </svg>

      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs text-ink-soft">learning rate</span>
        <input type="range" min={0.05} max={4} step={0.05} value={lr} onChange={(e) => setLr(Number(e.target.value))} className="w-full accent-accent" />
        <span className="w-10 text-right font-mono text-sm">{lr.toFixed(2)}</span>
      </div>

      <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span>step {stepper.step}/{path.length - 1}</span>
        <span>w = {offPlot ? w.toExponential(1) : w.toFixed(3)}</span>
        <span>J(w) = {jw > 1e6 ? jw.toExponential(1) : jw.toFixed(3)}</span>
        <span>dJ/dw = {Math.abs(grad) > 1e6 ? grad.toExponential(1) : grad.toFixed(3)}</span>
        <span className="font-medium" style={{ color: regime.color }}>
          {regime.text}
        </span>
      </div>

      <StepControls stepper={stepper} total={path.length} />
    </InteractiveShell>
  )
}
