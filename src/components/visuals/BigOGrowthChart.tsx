import { useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

// Per-curve colors validated (dataviz validator) in THIS adjacency order —
// complexity order is the legend order. Don't swap without re-validating.
const CURVES = [
  { key: '1', label: 'O(1)', color: '#7C3AED', f: (_n: number) => 1 },
  { key: 'logn', label: 'O(log n)', color: '#178A50', f: (n: number) => Math.log2(n) },
  { key: 'n', label: 'O(n)', color: '#2450E5', f: (n: number) => n },
  { key: 'nlogn', label: 'O(n log n)', color: '#B45309', f: (n: number) => n * Math.log2(n) },
  { key: 'n2', label: 'O(n²)', color: '#0284C7', f: (n: number) => n * n },
  { key: '2n', label: 'O(2ⁿ)', color: '#D33A2C', f: (n: number) => Math.pow(2, n) },
] as const

export type CurveKey = (typeof CURVES)[number]['key']

// Fixed logical space — the browser scales the SVG, coordinates never change.
const L = 46
const R = 552
const T = 14
const B = 284
const X_MAX = 100
const Y_MAX = 1000
const px = (n: number) => L + ((n - 1) / (X_MAX - 1)) * (R - L)
const py = (v: number) => B - (v / Y_MAX) * (B - T)

const fmt = (v: number): string => {
  if (v < 10) return (Math.round(v * 10) / 10).toString()
  if (v < 1e6) return Math.round(v).toLocaleString('en-IN')
  return v.toExponential(1).replace('e+', ' × 10^')
}

const DEFAULT_N = 20

export default function BigOGrowthChart({ initial }: { initial?: CurveKey[] }) {
  const [n, setN] = useState(DEFAULT_N)
  const [active, setActive] = useState<Set<CurveKey>>(() => new Set(initial ?? CURVES.map((c) => c.key)))

  const paths = useMemo(
    () =>
      CURVES.map((c) => {
        const pts: string[] = []
        for (let x = 1; x <= X_MAX; x += 0.5) {
          const v = c.f(x)
          if (!isFinite(v) || v > Y_MAX * 1.3) {
            pts.push(`${px(x).toFixed(1)},${(T - 8).toFixed(1)}`)
            break
          }
          pts.push(`${px(x).toFixed(1)},${py(v).toFixed(1)}`)
        }
        return { ...c, d: `M${pts.join('L')}` }
      }),
    [],
  )

  // Direct label anchor: the last visible sample of each curve, collision-nudged.
  const labels = useMemo(() => {
    const raw = CURVES.map((c) => {
      let lastN = X_MAX
      for (let x = 1; x <= X_MAX; x += 0.5) {
        if (c.f(x) > Y_MAX) {
          lastN = x
          break
        }
      }
      const v = Math.min(c.f(lastN), Y_MAX)
      return { key: c.key, label: c.label, color: c.color, x: px(lastN), y: Math.max(py(v), T + 6) }
    })
    const sorted = [...raw].sort((a, b) => a.y - b.y)
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]!
      const cur = sorted[i]!
      if (Math.abs(cur.x - prev.x) < 56 && cur.y - prev.y < 13) cur.y = prev.y + 13
    }
    // keep labels inside the plot vertically: walk the bottom cluster upward
    for (let i = sorted.length - 1; i >= 0; i--) {
      const cur = sorted[i]!
      cur.y = Math.min(cur.y, B - 2)
      const nxt = sorted[i + 1]
      if (nxt && Math.abs(cur.x - nxt.x) < 56 && nxt.y - cur.y < 13) cur.y = nxt.y - 13
    }
    return sorted
  }, [])

  const activeCurves = CURVES.filter((c) => active.has(c.key))

  return (
    <InteractiveShell
      title="How fast does work grow?"
      notice="Every curve looks harmless at n = 10. Slide n up and watch n² and 2ⁿ leave the chart — that difference is the whole reason Big-O exists."
      onReset={() => {
        setN(DEFAULT_N)
        setActive(new Set(initial ?? CURVES.map((c) => c.key)))
      }}
    >
      {/* Legend = toggles. Identity is never color-alone: label text + dot. */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {CURVES.map((c) => {
          const on = active.has(c.key)
          return (
            <button
              key={c.key}
              onClick={() =>
                setActive((prev) => {
                  const next = new Set(prev)
                  if (next.has(c.key)) next.delete(c.key)
                  else next.add(c.key)
                  return next
                })
              }
              className={`flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 font-mono text-xs transition-opacity ${on ? '' : 'opacity-40'}`}
            >
              <span className="size-2 rounded-full" style={{ background: c.color }} />
              {c.label}
            </button>
          )
        })}
      </div>

      <svg viewBox="0 0 600 320" className="h-auto w-full touch-none select-none">
        <clipPath id="bigo-plot">
          <rect x={L} y={T} width={R - L} height={B - T} />
        </clipPath>

        {/* recessive grid */}
        {[0, 250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line x1={L} y1={py(v)} x2={R} y2={py(v)} stroke={CHART_GRID} strokeWidth={1} />
            <text x={L - 6} y={py(v) + 3.5} textAnchor="end" fontSize={10} fill={CHART_AXIS}>
              {v}
            </text>
          </g>
        ))}
        {[1, 25, 50, 75, 100].map((v) => (
          <text key={v} x={px(v)} y={B + 14} textAnchor="middle" fontSize={10} fill={CHART_AXIS}>
            {v}
          </text>
        ))}
        <text x={(L + R) / 2} y={B + 30} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          n (input size)
        </text>
        <text x={12} y={(T + B) / 2} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS} transform={`rotate(-90 12 ${(T + B) / 2})`}>
          operations
        </text>

        {/* current-n marker */}
        <line x1={px(n)} y1={T} x2={px(n)} y2={B} stroke={CHART_AXIS} strokeWidth={1} strokeDasharray="3 3" />

        <g clipPath="url(#bigo-plot)">
          {paths.map(
            (c) =>
              active.has(c.key) && <path key={c.key} d={c.d} fill="none" stroke={c.color} strokeWidth={2} />,
          )}
        </g>

        {/* markers at current n: 2px surface ring per mark spec */}
        {activeCurves.map((c) => {
          const v = c.f(n)
          if (v > Y_MAX) return null
          return <circle key={c.key} cx={px(n)} cy={py(v)} r={4} fill={c.color} stroke="#fff" strokeWidth={2} />
        })}

        {/* direct labels: colored dot + ink text (text wears text tokens) */}
        {labels.map(
          (lb) =>
            active.has(lb.key) && (
              <g key={lb.key}>
                <circle cx={Math.min(lb.x + 6, 528)} cy={lb.y} r={2.5} fill={lb.color} />
                <text x={Math.min(lb.x + 11, 533)} y={lb.y + 3} fontSize={10.5} fill="#17191E" fontFamily="JetBrains Mono, monospace">
                  {lb.label}
                </text>
              </g>
            ),
        )}
      </svg>

      <div className="mt-2 flex items-center gap-3">
        <span className="shrink-0 font-mono text-xs whitespace-nowrap text-ink-soft">n =</span>
        <input
          type="range"
          min={1}
          max={X_MAX}
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <span className="w-9 text-right font-mono text-sm">{n}</span>
      </div>

      {/* readout = the hover layer + table view: exact operation counts at n */}
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
        {activeCurves.map((c) => {
          const v = c.f(n)
          return (
            <div key={c.key} className="flex items-center gap-2 text-[13px]">
              <span className="size-2 shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="font-mono text-xs text-ink-soft">{c.label}</span>
              <span className="ml-auto font-mono text-xs">
                {fmt(v)}
                {v > Y_MAX ? ' ↑' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </InteractiveShell>
  )
}
