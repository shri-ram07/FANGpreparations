import { useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

// Draggable 2D vectors: the geometry lesson (angle, dot product sign, projection)
// that a heatmap cannot give. Hand-built SVG, one logical coordinate space.
const W = 600
const H = 340
const CX = 300
const CY = 170
const UNIT = 52 // pixels per unit

const toPx = (x: number, y: number) => [CX + x * UNIT, CY - y * UNIT] as const

export default function VectorPlayground({
  a: a0 = [3, 1] as [number, number],
  b: b0 = [1, 2.4] as [number, number],
}: {
  a?: [number, number]
  b?: [number, number]
}) {
  const [a, setA] = useState<[number, number]>(a0)
  const [b, setB] = useState<[number, number]>(b0)
  const [drag, setDrag] = useState<'a' | 'b' | null>(null)
  const [showProj, setShowProj] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)

  const m = useMemo(() => {
    const dot = a[0] * b[0] + a[1] * b[1]
    const na = Math.hypot(a[0], a[1])
    const nb = Math.hypot(b[0], b[1])
    const cos = na && nb ? dot / (na * nb) : 0
    const deg = (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI
    // projection of b onto a
    const k = na ? dot / (na * na) : 0
    return { dot, na, nb, cos, deg, proj: [a[0] * k, a[1] * k] as [number, number] }
  }, [a, b])

  const onMove = (e: React.PointerEvent) => {
    if (!drag || !svgRef.current) return
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svgRef.current.getScreenCTM()!.inverse())
    const v: [number, number] = [
      Math.round(((p.x - CX) / UNIT) * 10) / 10,
      Math.round(((CY - p.y) / UNIT) * 10) / 10,
    ]
    if (drag === 'a') setA(v)
    else setB(v)
  }

  const [ax, ay] = toPx(a[0], a[1])
  const [bx, by] = toPx(b[0], b[1])
  const [px, py] = toPx(m.proj[0], m.proj[1])

  const sign = m.dot > 0.05 ? 'positive' : m.dot < -0.05 ? 'negative' : 'zero'
  const signColor = m.dot > 0.05 ? '#178A50' : m.dot < -0.05 ? '#D33A2C' : '#5A5F6A'

  return (
    <InteractiveShell
      title="Two vectors, one dot product"
      notice="Drag the arrowheads. Same direction gives a positive dot product, right angle gives exactly zero, opposite gives negative — the sign IS the similarity verdict."
      onReset={() => {
        setA(a0)
        setB(b0)
        setShowProj(true)
      }}
    >
      <label className="mb-2 flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
        <input type="checkbox" checked={showProj} onChange={(e) => setShowProj(e.target.checked)} />
        show the projection of b onto a (the "shadow")
      </label>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerUp={() => setDrag(null)}
        onPointerLeave={() => setDrag(null)}
      >
        <defs>
          <marker id="vp-a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#2450E5" />
          </marker>
          <marker id="vp-b" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#B45309" />
          </marker>
        </defs>

        {/* grid */}
        {Array.from({ length: 13 }, (_, i) => i - 6).map((i) => (
          <g key={i}>
            <line x1={CX + i * UNIT} y1={0} x2={CX + i * UNIT} y2={H} stroke={CHART_GRID} strokeWidth={1} />
            <line x1={0} y1={CY + i * UNIT} x2={W} y2={CY + i * UNIT} stroke={CHART_GRID} strokeWidth={1} />
          </g>
        ))}
        <line x1={0} y1={CY} x2={W} y2={CY} stroke={CHART_AXIS} strokeWidth={1.25} />
        <line x1={CX} y1={0} x2={CX} y2={H} stroke={CHART_AXIS} strokeWidth={1.25} />

        {/* projection shadow */}
        {showProj && (
          <>
            <line x1={bx} y1={by} x2={px} y2={py} stroke={CHART_AXIS} strokeWidth={1} strokeDasharray="4 3" />
            <line x1={CX} y1={CY} x2={px} y2={py} stroke="#178A50" strokeWidth={4} opacity={0.5} />
          </>
        )}

        {/* the two vectors */}
        <line x1={CX} y1={CY} x2={ax} y2={ay} stroke="#2450E5" strokeWidth={2.5} markerEnd="url(#vp-a)" />
        <line x1={CX} y1={CY} x2={bx} y2={by} stroke="#B45309" strokeWidth={2.5} markerEnd="url(#vp-b)" />

        {/* draggable handles */}
        <circle cx={ax} cy={ay} r={9} fill="#2450E5" opacity={drag === 'a' ? 0.35 : 0.15} className="cursor-grab"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag('a') }} />
        <circle cx={bx} cy={by} r={9} fill="#B45309" opacity={drag === 'b' ? 0.35 : 0.15} className="cursor-grab"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setDrag('b') }} />

        <text x={ax + 12} y={ay - 6} fontSize={12} fill="#2450E5" fontFamily="JetBrains Mono, monospace">
          a
        </text>
        <text x={bx + 12} y={by - 6} fontSize={12} fill="#B45309" fontFamily="JetBrains Mono, monospace">
          b
        </text>
      </svg>

      <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 font-mono text-[13px] sm:grid-cols-3">
        <span>a = ({a[0]}, {a[1]})</span>
        <span>b = ({b[0]}, {b[1]})</span>
        <span>angle = {m.deg.toFixed(1)}°</span>
        <span>|a| = {m.na.toFixed(2)}</span>
        <span>|b| = {m.nb.toFixed(2)}</span>
        <span>cos = {m.cos.toFixed(3)}</span>
      </div>
      <p className="mt-1 font-mono text-[13px]">
        a · b = {m.dot.toFixed(2)} — <span style={{ color: signColor }}>{sign}</span>
        {sign === 'zero' ? ' (orthogonal: no shared direction at all)' : sign === 'negative' ? ' (pointing apart)' : ' (pointing together)'}
      </p>
    </InteractiveShell>
  )
}
