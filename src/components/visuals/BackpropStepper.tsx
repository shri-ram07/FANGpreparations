import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

// Duplicated from NeuralNetForward's NET_LAYOUT (same 2-3-1 network, same
// geometry) — switch to `import { NET_LAYOUT } from './NeuralNetForward'`
// if/when that file exports it. Visual continuity between the two matters.
const R = 24
const IN_X = 80
const IN_YS = [105, 195]
const HID_X = 300
const HID_YS = [58, 150, 242]
const OUT_X = 520
const OUT_Y = 150

const X = [0.5, -0.4]
const TARGET = 1
const LR = 0.5
const W_HID = [
  [0.9, -0.5],
  [-0.6, 0.8],
  [0.4, -0.3],
]
const W_OUT = [0.8, -0.4, 0.6]

const fm = (n: number, d = 3) => `${n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}`
const pw = (n: number, d = 3) => (n < 0 ? `(${fm(n, d)})` : fm(n, d))

function forward(w: number[][], v: number[]) {
  const z = w.map((row) => row[0]! * X[0]! + row[1]! * X[1]!)
  const h = z.map((zi) => Math.max(0, zi))
  const zOut = v.reduce((s, vi, i) => s + vi * h[i]!, 0)
  const yHat = 1 / (1 + Math.exp(-zOut))
  return { z, h, zOut, yHat, loss: (yHat - TARGET) ** 2 }
}

interface Frame {
  w: number[][]
  v: number[]
  z: number[]
  h: number[]
  yHat: number
  loss: number
  dOut: number | null
  dH: (number | null)[]
  gV: (number | null)[]
  gW: (number | null)[][]
  hl: string | null
  note: string
  done: boolean
}

function simulate(): Frame[] {
  const w = W_HID.map((r) => [...r])
  const v = [...W_OUT]
  const gV: (number | null)[] = [null, null, null]
  const gW: (number | null)[][] = [
    [null, null],
    [null, null],
    [null, null],
  ]
  const dH: (number | null)[] = [null, null, null]
  let dOut: number | null = null
  let fwd = forward(w, v)
  const frames: Frame[] = []
  const push = (hl: string | null, note: string, done = false) => {
    frames.push({
      w: w.map((r) => [...r]),
      v: [...v],
      z: [...fwd.z],
      h: [...fwd.h],
      yHat: fwd.yHat,
      loss: fwd.loss,
      dOut,
      dH: [...dH],
      gV: [...gV],
      gW: gW.map((r) => [...r]),
      hl,
      note,
      done,
    })
  }

  push(
    null,
    `Forward: z = [${fwd.z.map((n) => fm(n)).join(', ')}], h = ReLU(z) = [${fwd.h.map((n) => fm(n)).join(', ')}], ŷ = σ(${fm(fwd.zOut)}) = ${fm(fwd.yHat)}. Note h2 died: z2 < 0.`,
  )
  push('loss', `Loss: L = (ŷ − y)² = (${fm(fwd.yHat)} − 1)² = ${fm(fwd.loss)}. Now run the chain rule backwards, one factor at a time.`)

  const dLdy = 2 * (fwd.yHat - TARGET)
  const sp = fwd.yHat * (1 - fwd.yHat)
  dOut = dLdy * sp
  push('out', `δ_out = ∂L/∂z_out = 2(ŷ−y) · ŷ(1−ŷ) = ${pw(dLdy)}·${fm(sp)} = ${fm(dOut)}`)

  for (let i = 0; i < 3; i++) {
    gV[i] = dOut * fwd.h[i]!
    const dead = fwd.h[i] === 0 ? ` — h${i + 1} is dead, so this weight gets zero gradient` : ''
    push(`v${i}`, `∂L/∂w_h${i + 1}→ŷ = δ_out · h${i + 1} = ${pw(dOut)}·${fm(fwd.h[i]!)} = ${fm(gV[i]!)}${dead}`)
  }

  for (let i = 0; i < 3; i++) {
    const rp = fwd.z[i]! > 0 ? 1 : 0
    dH[i] = dOut * v[i]! * rp
    const blocked = rp === 0 ? ` — ReLU′(${fm(fwd.z[i]!)}) = 0 blocks everything flowing into h${i + 1}` : ''
    push(
      `h${i}`,
      `δ_h${i + 1} = δ_out · w_h${i + 1}→ŷ · ReLU′(z${i + 1}) = ${pw(dOut)}·${pw(v[i]!)}·${rp} = ${fm(dH[i]!)}${blocked}`,
    )
    for (let j = 0; j < 2; j++) {
      gW[i]![j] = dH[i]! * X[j]!
      push(`w${i}${j}`, `∂L/∂w_x${j + 1}→h${i + 1} = δ_h${i + 1} · x${j + 1} = ${pw(dH[i]!)}·${pw(X[j]!)} = ${fm(gW[i]![j]!)}`)
    }
  }

  push(
    null,
    'All 9 gradients are on the board. Every one was a single multiply: (local derivative) × (upstream δ). Backprop never solved the whole network at once.',
  )

  const oldY = fwd.yHat
  const oldL = fwd.loss
  for (let i = 0; i < 3; i++) {
    v[i] = v[i]! - LR * gV[i]!
    for (let j = 0; j < 2; j++) w[i]![j] = w[i]![j]! - LR * gW[i]![j]!
  }
  dOut = null
  dH.fill(null)
  gV.fill(null)
  for (const r of gW) r.fill(null)
  fwd = forward(w, v)
  push(
    null,
    `SGD, lr 0.5: every weight steps against its own gradient, w ← w − 0.5·g. Forward re-run: ŷ ${fm(oldY)} → ${fm(fwd.yHat)}, L ${fm(oldL)} → ${fm(fwd.loss)}. That is learning — bookkeeping, then one nudge.`,
    true,
  )

  return frames
}

function edgePts(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  return { ax: x1 + ux * R, ay: y1 + uy * R, bx: x2 - ux * R, by: y2 - uy * R }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function Lbl({ x, y, fill, children }: { x: number; y: number; fill: string; children: ReactNode }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize={9.5}
      fontFamily="JetBrains Mono, monospace"
      fill={fill}
      paintOrder="stroke"
      stroke="#FFFFFF"
      strokeWidth={3}
    >
      {children}
    </text>
  )
}

function Node({ x, y, name, value, hot, dead }: { x: number; y: number; name: string; value: string; hot: boolean; dead?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={y} r={R} fill="#F6F7F4" stroke={hot ? '#F5A300' : '#E4E6E1'} strokeWidth={hot ? 2.5 : 1} />
      <text x={x} y={y - 4} textAnchor="middle" fontSize={10} fill="#5A5F6A">
        {name}
      </text>
      <text x={x} y={y + 10} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono, monospace" fill={dead ? '#B9BDB4' : '#17191E'}>
        {value}
      </text>
    </g>
  )
}

export default function BackpropStepper() {
  const frames = useMemo(() => simulate(), [])
  const stepper = useStepper(frames.length, 1600)
  const f = frames[stepper.step]!
  const firstLoss = frames[0]!.loss

  return (
    <InteractiveShell
      title="Backprop, one multiply at a time"
      notice="Every single gradient is (local derivative) × (upstream δ) — backprop is just disciplined bookkeeping of that product, backwards."
      onReset={stepper.reset}
    >
      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        <text x={8} y={16} fontSize={10.5} fill={CHART_AXIS}>
          input fixed · target y = 1 · lr 0.5
        </text>
        <text
          x={592}
          y={16}
          textAnchor="end"
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
          fill={f.hl === 'loss' ? '#17191E' : f.done ? '#178A50' : CHART_AXIS}
        >
          ŷ = {fm(f.yHat)} · L = {fm(f.loss)}
          {f.done && ` (was ${fm(firstLoss)})`}
        </text>

        {/* input → hidden edges, weight above gradient */}
        {HID_YS.map((hy, i) =>
          IN_YS.map((iy, j) => {
            const id = `w${i}${j}`
            const hot = f.hl === id
            const p = edgePts(IN_X, iy, HID_X, hy!)
            const lx = lerp(p.ax, p.bx, 0.72)
            const ly = lerp(p.ay, p.by, 0.72)
            const g = f.gW[i]![j]
            return (
              <g key={id}>
                <line x1={p.ax} y1={p.ay} x2={p.bx} y2={p.by} stroke={hot ? '#F5A300' : '#E4E6E1'} strokeWidth={hot ? 2.5 : 1.5} />
                <Lbl x={lx} y={ly} fill="#5A5F6A">
                  {fm(f.w[i]![j]!, 2)}
                </Lbl>
                {g !== null && (
                  <Lbl x={lx} y={ly + 11} fill="#D33A2C">
                    g={fm(g)}
                  </Lbl>
                )}
              </g>
            )
          }),
        )}

        {/* hidden → output edges */}
        {HID_YS.map((hy, i) => {
          const id = `v${i}`
          const hot = f.hl === id
          const p = edgePts(HID_X, hy!, OUT_X, OUT_Y)
          const lx = lerp(p.ax, p.bx, 0.3)
          const ly = lerp(p.ay, p.by, 0.3)
          const g = f.gV[i]
          return (
            <g key={id}>
              <line x1={p.ax} y1={p.ay} x2={p.bx} y2={p.by} stroke={hot ? '#F5A300' : '#E4E6E1'} strokeWidth={hot ? 2.5 : 1.5} />
              <Lbl x={lx} y={ly} fill="#5A5F6A">
                {fm(f.v[i]!, 2)}
              </Lbl>
              {g !== null && (
                <Lbl x={lx} y={ly + 11} fill="#D33A2C">
                  g={fm(g)}
                </Lbl>
              )}
            </g>
          )
        })}

        {/* nodes */}
        {IN_YS.map((iy, j) => (
          <Node key={`x${j}`} x={IN_X} y={iy!} name={`x${j + 1}`} value={fm(X[j]!, 2)} hot={false} />
        ))}
        {HID_YS.map((hy, i) => (
          <Node key={`h${i}`} x={HID_X} y={hy!} name={`h${i + 1}`} value={fm(f.h[i]!, 2)} hot={f.hl === `h${i}`} dead={f.h[i] === 0} />
        ))}
        <Node x={OUT_X} y={OUT_Y} name="ŷ" value={fm(f.yHat, 3)} hot={f.hl === 'out' || f.hl === 'loss'} />

        {/* accumulated δ labels */}
        {f.dOut !== null && (
          <Lbl x={OUT_X} y={OUT_Y + R + 14} fill="#D33A2C">
            δ={fm(f.dOut)}
          </Lbl>
        )}
        {f.dH.map((d, i) =>
          d !== null ? (
            <Lbl key={`dh${i}`} x={HID_X} y={HID_YS[i]! + R + 13} fill="#D33A2C">
              δ={fm(d)}
            </Lbl>
          ) : null,
        )}
      </svg>

      <p className={`my-2 min-h-16 font-mono text-[13px] ${f.done ? 'text-correct' : 'text-ink'}`}>{f.note}</p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
