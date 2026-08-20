import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

const POS = '#2450E5'
const NEG = '#B45309'

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

interface Pt {
  score: number
  positive: boolean
  jitter: number
}

// deterministic dataset: seeded, computed once
const POINTS: Pt[] = (() => {
  const rand = mulberry32(20240819)
  const gauss = () => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-9))) * Math.cos(2 * Math.PI * rand())
  const clip = (x: number) => Math.min(1, Math.max(0, x))
  const pts: Pt[] = []
  for (let i = 0; i < 25; i++) pts.push({ score: clip(0.66 + 0.14 * gauss()), positive: true, jitter: (rand() - 0.5) * 24 })
  for (let i = 0; i < 25; i++) pts.push({ score: clip(0.34 + 0.14 * gauss()), positive: false, jitter: (rand() - 0.5) * 24 })
  return pts
})()

function counts(t: number) {
  let tp = 0
  let fp = 0
  let fn = 0
  let tn = 0
  for (const p of POINTS) {
    const pred = p.score >= t
    if (p.positive) {
      if (pred) tp++
      else fn++
    } else {
      if (pred) fp++
      else tn++
    }
  }
  return { tp, fp, fn, tn }
}

// strip plot geometry (logical units)
const PAD_L = 24
const SPAN = 552
const sx = (s: number) => PAD_L + s * SPAN
// ROC geometry
const RL = 38
const RR = 288
const RT = 12
const RB = 182
const rx = (fpr: number) => RL + fpr * (RR - RL)
const ry = (tpr: number) => RB - tpr * (RB - RT)

export default function ConfusionMatrixLab() {
  const [threshold, setThreshold] = useState(0.5)
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0.5]))
  const [sweeping, setSweeping] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragging = useRef(false)

  const moveThreshold = (t: number) => {
    const c = Math.min(1, Math.max(0, t))
    setThreshold(c)
    const key = Math.round(c * 100) / 100
    setVisited((v) => (v.has(key) ? v : new Set(v).add(key)))
  }

  useEffect(() => {
    if (!sweeping) return
    let t = 1
    const id = setInterval(() => {
      t = Math.round((t - 0.02) * 100) / 100
      moveThreshold(Math.max(t, 0))
      if (t <= 0) setSweeping(false)
    }, 30)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sweeping])

  const scoreAt = (clientX: number, clientY: number): number | null => {
    const svg = svgRef.current
    if (!svg) return null
    const p = new DOMPoint(clientX, clientY).matrixTransform(svg.getScreenCTM()!.inverse())
    return (p.x - PAD_L) / SPAN
  }

  const { tp, fp, fn, tn } = counts(threshold)
  const precision = tp + fp > 0 ? tp / (tp + fp) : null
  const recall = tp / (tp + fn)
  const f1 = precision !== null && precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : null
  const accuracy = (tp + tn) / POINTS.length
  const fmt = (x: number | null) => (x === null ? '—' : x.toFixed(2))

  const rocDots = useMemo(
    () =>
      Array.from(visited).map((t) => {
        const c = counts(t)
        return { t, tpr: c.tp / (c.tp + c.fn), fpr: c.fp / (c.fp + c.tn) }
      }),
    [visited],
  )
  const cur = { tpr: tp / (tp + fn), fpr: fp / (fp + tn) }

  const tx = sx(threshold)
  const cells = [
    { label: 'TP', count: tp, good: true, sub: 'hit' },
    { label: 'FN', count: fn, good: false, sub: 'miss' },
    { label: 'FP', count: fp, good: false, sub: 'false alarm' },
    { label: 'TN', count: tn, good: true, sub: 'correct reject' },
  ]

  return (
    <InteractiveShell
      title="One threshold, four fates"
      notice="Drag right — precision rises, recall falls; there is no free lunch, only a threshold that matches the cost of each mistake (spam vs cancer)."
      onReset={() => {
        setSweeping(false)
        setThreshold(0.5)
        setVisited(new Set([0.5]))
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 600 150"
        className="h-auto w-full cursor-ew-resize touch-none select-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          dragging.current = true
          const s = scoreAt(e.clientX, e.clientY)
          if (s !== null) moveThreshold(s)
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          const s = scoreAt(e.clientX, e.clientY)
          if (s !== null) moveThreshold(s)
        }}
        onPointerUp={() => {
          dragging.current = false
        }}
        onPointerCancel={() => {
          dragging.current = false
        }}
      >
        {/* predicted-positive band */}
        <rect x={tx} y={24} width={Math.max(sx(1) - tx, 0)} height={98} fill="rgba(36,80,229,0.07)" />
        <text x={sx(1)} y={118} textAnchor="end" fontSize={10} fill={CHART_AXIS}>
          shaded side = predicted positive
        </text>

        {/* row labels: dot + text, never color alone */}
        <circle cx={PAD_L + 4} cy={13} r={4} fill={POS} />
        <text x={PAD_L + 13} y={16.5} fontSize={10.5} fill={CHART_AXIS}>
          actual positive (25)
        </text>
        <circle cx={PAD_L + 4} cy={75} r={4} fill={NEG} />
        <text x={PAD_L + 13} y={78.5} fontSize={10.5} fill={CHART_AXIS}>
          actual negative (25)
        </text>

        {POINTS.map((p, i) => (
          <circle key={i} cx={sx(p.score)} cy={(p.positive ? 42 : 102) + p.jitter} r={4.5} fill={p.positive ? POS : NEG} fillOpacity={0.85} />
        ))}

        {/* score axis */}
        <line x1={sx(0)} y1={124} x2={sx(1)} y2={124} stroke={CHART_GRID} />
        {[0, 0.5, 1].map((v) => (
          <text key={v} x={sx(v)} y={136} textAnchor="middle" fontSize={10} fill={CHART_AXIS}>
            {v}
          </text>
        ))}

        {/* draggable threshold */}
        <line x1={tx} y1={22} x2={tx} y2={124} stroke="#17191E" strokeWidth={2} />
        <text
          x={Math.min(Math.max(tx, 50), 550)}
          y={148}
          textAnchor="middle"
          fontSize={11}
          fontFamily="JetBrains Mono, monospace"
          fill="#17191E"
        >
          t = {threshold.toFixed(2)}
        </text>
      </svg>

      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-1 text-center">
            <span />
            <span className="text-[10px] tracking-wide text-ink-soft uppercase">pred +</span>
            <span className="text-[10px] tracking-wide text-ink-soft uppercase">pred −</span>
            {cells.map((c, i) => (
              <Fragment key={c.label}>
                {i % 2 === 0 && (
                  <span className="pr-1 text-[10px] tracking-wide text-ink-soft uppercase">
                    {i === 0 ? 'actual +' : 'actual −'}
                  </span>
                )}
                <div
                  className="rounded-md border border-line px-2 py-1.5"
                  style={{ background: c.good ? 'rgba(23,138,80,0.10)' : 'rgba(211,58,44,0.08)' }}
                >
                  <div className={`text-[10px] font-semibold ${c.good ? 'text-correct' : 'text-wrong'}`}>
                    {c.label} · {c.sub}
                  </div>
                  <div className="font-mono text-lg text-ink">{c.count}</div>
                </div>
              </Fragment>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-ink">
            <span>precision {fmt(precision)}</span>
            <span>recall {fmt(recall)}</span>
            <span>F1 {fmt(f1)}</span>
            <span>accuracy {fmt(accuracy)}</span>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-ink-soft">ROC — every threshold you visit leaves a dot</span>
            <button
              onClick={() => setSweeping(true)}
              disabled={sweeping}
              className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-accent disabled:opacity-40"
            >
              Sweep 1→0
            </button>
          </div>
          <svg viewBox="0 0 300 220" className="h-auto w-full select-none">
            <line x1={RL} y1={RB} x2={RR} y2={RB} stroke={CHART_GRID} />
            <line x1={RL} y1={RT} x2={RL} y2={RB} stroke={CHART_GRID} />
            <line x1={rx(0)} y1={ry(0)} x2={rx(1)} y2={ry(1)} stroke={CHART_GRID} strokeDasharray="4 3" />
            <text x={(RL + RR) / 2} y={210} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
              FPR (false alarms / 25 negatives)
            </text>
            <text x={12} y={(RT + RB) / 2} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS} transform={`rotate(-90 12 ${(RT + RB) / 2})`}>
              TPR (recall)
            </text>
            <text x={RL} y={RB + 12} textAnchor="middle" fontSize={10} fill={CHART_AXIS}>
              0
            </text>
            <text x={RR} y={RB + 12} textAnchor="middle" fontSize={10} fill={CHART_AXIS}>
              1
            </text>
            <text x={RL - 6} y={RT + 4} textAnchor="end" fontSize={10} fill={CHART_AXIS}>
              1
            </text>
            {rocDots.map((d) => (
              <circle key={d.t} cx={rx(d.fpr)} cy={ry(d.tpr)} r={2.5} fill="#2450E5" opacity={0.45} />
            ))}
            <circle cx={rx(cur.fpr)} cy={ry(cur.tpr)} r={5} fill="#2450E5" stroke="#FFFFFF" strokeWidth={2} />
          </svg>
        </div>
      </div>
    </InteractiveShell>
  )
}
