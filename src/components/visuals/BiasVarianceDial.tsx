import { useId, useMemo } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from './shell/colors'

const TRAIN_C = CHART_SERIES[0] // cobalt — train
const TEST_C = CHART_SERIES[1] // amber-dark — test

const trueF = (x: number) => Math.sin(2.2 * Math.PI * x) * 0.8

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

// Gaussian elimination with partial pivoting — Ax=b at 10x10 max, trivial size
function solve(A: number[][], b: number[]): number[] {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]!])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r]![col]!) > Math.abs(M[piv]![col]!)) piv = r
    const tmp = M[col]!
    M[col] = M[piv]!
    M[piv] = tmp
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r]![col]! / M[col]![col]!
      for (let c = col; c <= n; c++) M[r]![c] = M[r]![c]! - f * M[col]![c]!
    }
  }
  return M.map((row, i) => row[n]! / row[i]!)
}

// main chart geometry (logical viewBox units)
const L = 40
const R = 588
const T = 30
const B = 226
const Y_MAX = 1.6
const px = (x: number) => L + x * (R - L)
const py = (y: number) => B - ((Math.max(-8, Math.min(8, y)) + Y_MAX) / (2 * Y_MAX)) * (B - T)

// mini error-chart geometry
const ML = 40
const MR = 540
const MT = 14
const MB = 88
const mx = (d: number) => ML + (d / 9) * (MR - ML)

interface Pt {
  x: number
  y: number
}

interface Frame {
  degree: number
  curve: string
  mseTrain: number
  mseTest: number
}

function simulate() {
  const rnd = mulberry32(7)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd())
  const pt = (): Pt => {
    const x = rnd()
    return { x, y: trueF(x) + 0.18 * gauss() }
  }
  const train = Array.from({ length: 15 }, pt)
  const test = Array.from({ length: 10 }, pt)

  const evalP = (c: number[], x: number) => c.reduceRight((acc, ci) => acc * x + ci, 0)
  const mse = (c: number[], pts: Pt[]) => pts.reduce((s, p) => s + (evalP(c, p.x) - p.y) ** 2, 0) / pts.length

  const frames: Frame[] = []
  for (let d = 0; d <= 9; d++) {
    const m = d + 1
    // normal equations (XᵀX + 1e-8·I)β = Xᵀy
    const A: number[][] = Array.from({ length: m }, () => new Array<number>(m).fill(0))
    const b = new Array<number>(m).fill(0)
    for (const p of train) {
      const pow = [1]
      for (let k = 1; k <= 2 * d; k++) pow.push(pow[k - 1]! * p.x)
      for (let i = 0; i < m; i++) {
        b[i] = b[i]! + p.y * pow[i]!
        for (let j = 0; j < m; j++) A[i]![j] = A[i]![j]! + pow[i + j]!
      }
    }
    for (let i = 0; i < m; i++) A[i]![i] = A[i]![i]! + 1e-8
    const coefs = solve(A, b)
    const curve = `M${Array.from({ length: 161 }, (_, i) => {
      const x = i / 160
      return `${px(x).toFixed(1)},${py(evalP(coefs, x)).toFixed(1)}`
    }).join('L')}`
    frames.push({ degree: d, curve, mseTrain: mse(coefs, train), mseTest: mse(coefs, test) })
  }

  const trueCurve = `M${Array.from({ length: 161 }, (_, i) => {
    const x = i / 160
    return `${px(x).toFixed(1)},${py(trueF(x)).toFixed(1)}`
  }).join('L')}`

  // error curves on a log scale — the U survives even when degree-9 test MSE explodes
  const log = (v: number) => Math.log10(Math.max(v, 1e-4))
  const logs = frames.flatMap((f) => [log(f.mseTrain), log(f.mseTest)])
  const lo = Math.min(...logs)
  const hi = Math.max(...logs)
  const my = (v: number) => MB - ((log(v) - lo) / (hi - lo || 1)) * (MB - MT)
  const errPts = frames.map((f) => ({ x: mx(f.degree), yTr: my(f.mseTrain), yTe: my(f.mseTest) }))
  const trainLine = `M${errPts.map((p) => `${p.x.toFixed(1)},${p.yTr.toFixed(1)}`).join('L')}`
  const testLine = `M${errPts.map((p) => `${p.x.toFixed(1)},${p.yTe.toFixed(1)}`).join('L')}`

  return { train, test, frames, trueCurve, errPts, trainLine, testLine }
}

const fmt = (v: number) => (v >= 1000 ? v.toExponential(1) : v.toFixed(3))

export default function BiasVarianceDial() {
  const sim = useMemo(() => simulate(), [])
  const stepper = useStepper(sim.frames.length, 700)
  const clipId = useId()
  const f = sim.frames[stepper.step]!
  const cur = sim.errPts[stepper.step]!

  return (
    <InteractiveShell
      title="The bias–variance dial"
      notice="Train error only ever falls — test error makes a U; the bottom of the U is where real models live, and the right side is what overfitting looks like."
      onReset={stepper.reset}
    >
      <svg viewBox="0 0 600 258" className="h-auto w-full select-none">
        <defs>
          <clipPath id={clipId}>
            <rect x={L} y={T} width={R - L} height={B - T} />
          </clipPath>
        </defs>

        {/* legend */}
        <circle cx={L + 4} cy={12} r={3.5} fill={TRAIN_C} />
        <text x={L + 12} y={15.5} fontSize={10.5} fill={CHART_AXIS}>
          train
        </text>
        <circle cx={L + 54} cy={12} r={3.5} fill="#FFFFFF" stroke={TEST_C} strokeWidth={1.8} />
        <text x={L + 62} y={15.5} fontSize={10.5} fill={CHART_AXIS}>
          test
        </text>
        <line x1={L + 100} y1={12} x2={L + 118} y2={12} stroke="#17191E" strokeWidth={2} />
        <text x={L + 124} y={15.5} fontSize={10.5} fill={CHART_AXIS}>
          fit, degree {f.degree}
        </text>
        <line x1={L + 204} y1={12} x2={L + 222} y2={12} stroke="#17191E" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.35} />
        <text x={L + 228} y={15.5} fontSize={10.5} fill={CHART_AXIS}>
          true f(x)
        </text>

        {/* axes */}
        <line x1={L} y1={py(0)} x2={R} y2={py(0)} stroke={CHART_GRID} />
        <line x1={L} y1={B} x2={R} y2={B} stroke={CHART_GRID} />
        <text x={(L + R) / 2} y={B + 22} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          x ∈ [0, 1]
        </text>

        <path d={sim.trueCurve} fill="none" stroke="#17191E" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.35} />
        <path d={f.curve} fill="none" stroke="#17191E" strokeWidth={2} clipPath={`url(#${clipId})`} />

        {sim.train.map((p, i) => (
          <circle key={`tr${i}`} cx={px(p.x)} cy={py(p.y)} r={3.5} fill={TRAIN_C} />
        ))}
        {sim.test.map((p, i) => (
          <circle key={`te${i}`} cx={px(p.x)} cy={py(p.y)} r={3.5} fill="#FFFFFF" stroke={TEST_C} strokeWidth={1.8} />
        ))}
      </svg>

      <div className="my-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span>degree = {f.degree}</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: TRAIN_C }} />
          MSE train = {fmt(f.mseTrain)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full border" style={{ borderColor: TEST_C, background: '#FFFFFF' }} />
          MSE test = {fmt(f.mseTest)}
        </span>
      </div>

      <svg viewBox="0 0 600 120" className="h-auto w-full select-none">
        <text x={ML} y={MT - 3} fontSize={10} fill={CHART_AXIS}>
          MSE (log scale)
        </text>
        <line x1={ML} y1={MB} x2={MR} y2={MB} stroke={CHART_GRID} />

        <path d={sim.trainLine} fill="none" stroke={TRAIN_C} strokeWidth={1.5} />
        <path d={sim.testLine} fill="none" stroke={TEST_C} strokeWidth={1.5} />

        {sim.errPts.map((p, d) => (
          <g key={d}>
            <circle cx={p.x} cy={p.yTr} r={2.5} fill={TRAIN_C} />
            <circle cx={p.x} cy={p.yTe} r={2.5} fill={TEST_C} />
            <text x={p.x} y={MB + 16} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill={d === stepper.step ? '#17191E' : CHART_AXIS}>
              {d}
            </text>
          </g>
        ))}

        {/* surface-ring markers at the current degree */}
        <circle cx={cur.x} cy={cur.yTr} r={6} fill="#FFFFFF" />
        <circle cx={cur.x} cy={cur.yTr} r={3} fill={TRAIN_C} />
        <circle cx={cur.x} cy={cur.yTe} r={6} fill="#FFFFFF" />
        <circle cx={cur.x} cy={cur.yTe} r={3} fill={TEST_C} />

        {/* direct labels at line ends */}
        <circle cx={MR + 10} cy={sim.errPts[9]!.yTr} r={2.5} fill={TRAIN_C} />
        <text x={MR + 16} y={sim.errPts[9]!.yTr + 3.5} fontSize={10.5} fill="#17191E">
          train
        </text>
        <circle cx={MR + 10} cy={sim.errPts[9]!.yTe} r={2.5} fill={TEST_C} />
        <text x={MR + 16} y={sim.errPts[9]!.yTe + 3.5} fontSize={10.5} fill="#17191E">
          test
        </text>
        <text x={(ML + MR) / 2} y={MB + 30} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          polynomial degree
        </text>
      </svg>

      <StepControls stepper={stepper} total={sim.frames.length} />
    </InteractiveShell>
  )
}
