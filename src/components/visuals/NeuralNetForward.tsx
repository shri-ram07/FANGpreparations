import { useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

// Node positions in the 600x300 viewBox, exported so BackpropStepper can match.
export const NET_LAYOUT = {
  inputs: [
    { x: 90, y: 105 },
    { x: 90, y: 195 },
  ],
  hidden: [
    { x: 300, y: 60 },
    { x: 300, y: 150 },
    { x: 300, y: 240 },
  ],
  output: { x: 510, y: 150 },
  r: 22,
}

// weights[i * 3 + j] = input i → hidden j; weights[6 + j] = hidden j → output
const DEFAULT_WEIGHTS = [0.8, -1.2, 0.5, 0.6, 0.9, -0.7, 1.1, -0.8, 0.6]
const B1 = [0.1, -0.2, 0.05]
const B_OUT = -0.1

interface EdgeDef {
  from: { x: number; y: number }
  to: { x: number; y: number }
  name: string
  layer: 1 | 2
  t: number // where along the edge its weight label sits (staggered to avoid collisions)
}

const EDGES: EdgeDef[] = [
  ...NET_LAYOUT.inputs.flatMap((p, i) =>
    NET_LAYOUT.hidden.map(
      (q, j): EdgeDef => ({ from: p, to: q, name: `x${i + 1}→h${j + 1}`, layer: 1, t: i === 0 ? 0.28 : 0.72 }),
    ),
  ),
  ...NET_LAYOUT.hidden.map((q, j): EdgeDef => ({ from: q, to: NET_LAYOUT.output, name: `h${j + 1}→ŷ`, layer: 2, t: 0.35 })),
]

const NODES = [
  ...NET_LAYOUT.inputs.map((p, i) => ({ ...p, name: `x${i + 1}`, layer: 0 })),
  ...NET_LAYOUT.hidden.map((p, j) => ({ ...p, name: `h${j + 1}`, layer: 1 })),
  { ...NET_LAYOUT.output, name: 'ŷ', layer: 2 },
]

const STAGE_NAMES = ['Input layer', 'Hidden layer — ReLU', 'Output — sigmoid']

// factor in a product: negatives get parens; standalone value: plain signed
const num = (v: number) => (v < 0 ? `(−${Math.abs(v).toFixed(2)})` : v.toFixed(2))
const fx = (v: number) => v.toFixed(2).replace('-', '−')
const edgeW = (w: number) => 0.5 + Math.min(Math.abs(w), 2) * 1.75
const edgeColor = (w: number) => (w < 0 ? '#D33A2C' : '#2450E5')

export default function NeuralNetForward() {
  const [x1, setX1] = useState(0.5)
  const [x2, setX2] = useState(-0.4)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [sel, setSel] = useState(0)
  const stepper = useStepper(3)

  const fwd = useMemo(() => {
    const z = [0, 1, 2].map((j) => weights[j]! * x1 + weights[3 + j]! * x2 + B1[j]!)
    const h = z.map((v) => Math.max(0, v))
    const zOut = weights[6]! * h[0]! + weights[7]! * h[1]! + weights[8]! * h[2]! + B_OUT
    const yhat = 1 / (1 + Math.exp(-zOut))
    return { z, h, zOut, yhat }
  }, [x1, x2, weights])

  // 3 frames = 3 layers of the SAME live computation; frame count never changes,
  // so sliders deliberately do NOT reset the stepper — the point is to sit on a
  // stage and watch its numbers move.
  const stages = useMemo(
    () => [
      [`x1 = ${fx(x1)}, x2 = ${fx(x2)} — inputs enter the net unchanged`],
      [0, 1, 2].map(
        (j) =>
          `h${j + 1} = relu(${num(weights[j]!)}·${num(x1)} + ${num(weights[3 + j]!)}·${num(x2)} + ${num(B1[j]!)}) = relu(${fx(fwd.z[j]!)}) = ${fx(fwd.h[j]!)}`,
      ),
      [
        `ŷ = σ(${num(weights[6]!)}·${num(fwd.h[0]!)} + ${num(weights[7]!)}·${num(fwd.h[1]!)} + ${num(weights[8]!)}·${num(fwd.h[2]!)} + ${num(B_OUT)}) = σ(${fx(fwd.zOut)}) = ${fx(fwd.yhat)}`,
      ],
    ],
    [x1, x2, weights, fwd],
  )

  const stage = stepper.step
  const vals = [x1, x2, fwd.h[0]!, fwd.h[1]!, fwd.h[2]!, fwd.yhat]
  const op = (layer: number) => (layer === stage ? 1 : layer < stage ? 0.55 : 0.18)
  const setWeight = (i: number, v: number) => setWeights((ws) => ws.map((wv, k) => (k === i ? v : wv)))

  return (
    <InteractiveShell
      title="Forward pass through a 2-3-1 net"
      notice="Nudge one weight and watch every downstream number move — that sensitivity, measured exactly, is what backprop computes."
      onReset={() => {
        setX1(0.5)
        setX2(-0.4)
        setWeights(DEFAULT_WEIGHTS)
        setSel(0)
        stepper.reset()
      }}
    >
      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        <text x={12} y={14} fontSize={10} fill={CHART_AXIS}>
          blue = positive weight, red = negative · thickness = |w| · click an edge to edit it
        </text>

        {EDGES.map((e, i) => {
          const wv = weights[i]!
          const lx = e.from.x + (e.to.x - e.from.x) * e.t
          const ly = e.from.y + (e.to.y - e.from.y) * e.t - 4
          return (
            <g key={e.name} opacity={op(e.layer)} onClick={() => setSel(i)} className="cursor-pointer">
              {sel === i && (
                <line
                  x1={e.from.x}
                  y1={e.from.y}
                  x2={e.to.x}
                  y2={e.to.y}
                  stroke="#2450E5"
                  strokeWidth={edgeW(wv) + 6}
                  strokeLinecap="round"
                  opacity={0.2}
                />
              )}
              <line
                x1={e.from.x}
                y1={e.from.y}
                x2={e.to.x}
                y2={e.to.y}
                stroke={edgeColor(wv)}
                strokeWidth={edgeW(wv) + (sel === i ? 1.2 : 0)}
              />
              {/* wide invisible hit target */}
              <line x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke="transparent" strokeWidth={12} />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                fontWeight={sel === i ? 600 : 400}
                fill={sel === i ? '#17191E' : CHART_AXIS}
              >
                {wv.toFixed(2)}
              </text>
            </g>
          )
        })}

        {NODES.map((n, i) => (
          <g key={n.name} opacity={op(n.layer)}>
            <circle
              cx={n.x}
              cy={n.y}
              r={NET_LAYOUT.r}
              fill="#FFFFFF"
              stroke={n.layer === stage ? '#2450E5' : '#E4E6E1'}
              strokeWidth={n.layer === stage ? 1.5 : 1}
            />
            <text x={n.x} y={n.y - NET_LAYOUT.r - 7} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
              {n.name}
            </text>
            <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} fontFamily="JetBrains Mono, monospace" fill="#17191E">
              {vals[i]!.toFixed(2)}
            </text>
          </g>
        ))}

        <text x={90} y={292} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          inputs
        </text>
        <text x={300} y={292} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          ReLU
        </text>
        <text x={510} y={292} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          sigmoid
        </text>
      </svg>

      <div className="mt-1 flex items-center gap-3">
        <span className="w-28 shrink-0 font-mono text-xs text-accent">w {EDGES[sel]!.name}</span>
        <input
          type="range"
          min={-2}
          max={2}
          step={0.1}
          value={weights[sel]!}
          onChange={(e) => setWeight(sel, Number(e.target.value))}
          className="w-full accent-accent"
        />
        <span className="w-12 text-right font-mono text-sm">{weights[sel]!.toFixed(2)}</span>
      </div>
      {([0, 1] as const).map((i) => (
        <div key={i} className="mt-1 flex items-center gap-3">
          <span className="w-28 shrink-0 font-mono text-xs text-ink-soft">x{i + 1}</span>
          <input
            type="range"
            min={-1}
            max={1}
            step={0.05}
            value={i === 0 ? x1 : x2}
            onChange={(e) => (i === 0 ? setX1(Number(e.target.value)) : setX2(Number(e.target.value)))}
            className="w-full accent-accent"
          />
          <span className="w-12 text-right font-mono text-sm">{(i === 0 ? x1 : x2).toFixed(2)}</span>
        </div>
      ))}

      <div className="my-2 min-h-[76px] font-mono text-[12px] leading-5">
        <div className="text-ink-soft">{STAGE_NAMES[stage]}</div>
        {stages[stage]!.map((line) => (
          <div key={line} className="text-ink">
            {line}
          </div>
        ))}
      </div>

      <StepControls stepper={stepper} total={3} />
    </InteractiveShell>
  )
}
