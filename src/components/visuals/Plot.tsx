import { useId, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from './shell/colors'

// The general-purpose chart the content files were missing. Every other visual
// in this folder hardcodes its own dataset for one topic; this one takes the
// numbers as props, so any module can draw a curve, a cloud of points or a bar
// without a new component.
//
// Series are ALWAYS direct-labelled, not just legended: the validated palette's
// green/brown adjacent pair sits in the 6-8 CVD band, which is only legal with
// a secondary encoding. Do not remove the labels to "clean up" the chart.

export interface PlotSeries {
  name: string
  /** [x, y] pairs, in data units. Sorted by x for 'line' and 'area'. */
  points: [number, number][]
  /** Draw a dot at every point. Defaults to true for scatter, false otherwise
   *  — and false for a reference line, which is a line and not observations. */
  dots?: boolean
  /** Dashed — for a reference/ideal line that is not measured data. Implies a
   *  connecting line even inside a scatter (e.g. a fitted axis through a cloud). */
  dashed?: boolean
  /** Force a connecting line for this series inside a scatter plot. */
  line?: boolean
}

export interface PlotBar {
  label: string
  value: number
  /** Index into the series palette; same entity keeps the same colour. */
  color?: number
}

export interface PlotMarker {
  x: number
  y: number
  text: string
}

interface Props {
  title: string
  /** The one sentence a reader should take away — rendered under the chart. */
  notice: string
  kind: 'line' | 'area' | 'scatter' | 'bar'
  /** line | area | scatter. */
  series?: PlotSeries[]
  /** bar only. */
  bars?: PlotBar[]
  xLabel?: string
  yLabel?: string
  /** Callouts pinned to a data coordinate (line/area/scatter only). */
  markers?: PlotMarker[]
  /** Force the y range instead of fitting the data (e.g. a probability axis). */
  yMin?: number
  yMax?: number
  /** Format shown in tick labels and tooltips. */
  unit?: string
}

const W = 640
const H = 340
const PAD = { top: 18, right: 96, bottom: 46, left: 60 }
const IW = W - PAD.left - PAD.right
const IH = H - PAD.top - PAD.bottom

/** Round a range outward to friendly tick values. */
function ticks(lo: number, hi: number, count = 5): number[] {
  if (!isFinite(lo) || !isFinite(hi) || lo === hi) return [lo]
  const raw = (hi - lo) / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag
  const out: number[] = []
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(Number(v.toFixed(10)))
  return out
}

const fmt = (v: number, unit?: string) => {
  const a = Math.abs(v)
  const s = a >= 10000 ? v.toExponential(1) : a >= 100 ? v.toFixed(0) : a >= 1 ? v.toFixed(2).replace(/\.00$/, '') : String(Number(v.toFixed(4)))
  return unit ? `${s}${unit}` : s
}

export default function Plot({
  title,
  notice,
  kind,
  series = [],
  bars = [],
  xLabel,
  yLabel,
  markers = [],
  yMin,
  yMax,
  unit,
}: Props) {
  const uid = useId().replace(/:/g, '')
  const [hover, setHover] = useState<{ x: number; y: number; label: string } | null>(null)

  const isBar = kind === 'bar'

  const scale = useMemo(() => {
    if (isBar) {
      const vals = bars.map((b) => b.value)
      const lo = Math.min(0, ...vals)
      const hi = yMax ?? Math.max(...vals, 0)
      const pad = (hi - lo) * 0.08 || 1
      return { x0: 0, x1: 1, y0: yMin ?? lo, y1: hi + pad }
    }
    const xs = series.flatMap((s) => s.points.map((p) => p[0]))
    const ys = series.flatMap((s) => s.points.map((p) => p[1]))
    const yLo = yMin ?? Math.min(...ys)
    const yHi = yMax ?? Math.max(...ys)
    const padY = (yHi - yLo) * 0.08 || 1
    return {
      x0: Math.min(...xs),
      x1: Math.max(...xs),
      y0: yMin ?? yLo - padY,
      y1: yMax ?? yHi + padY,
    }
  }, [isBar, bars, series, yMin, yMax])

  const sx = (v: number) => PAD.left + ((v - scale.x0) / (scale.x1 - scale.x0 || 1)) * IW
  const sy = (v: number) => PAD.top + IH - ((v - scale.y0) / (scale.y1 - scale.y0 || 1)) * IH

  const yTicks = ticks(scale.y0, scale.y1)
  const xTicks = isBar ? [] : ticks(scale.x0, scale.x1)

  // Direct labels: y of each series' last point, nudged apart so they never collide.
  const labels = useMemo(() => {
    if (isBar) return []
    const raw: { name: string; y: number; color: string }[] = []
    series.forEach((s, i) => {
      const last = s.points[s.points.length - 1]
      // Clamp into the plot area: a series whose last point is outside the
      // y range would otherwise park its label outside the viewBox and vanish.
      // Losing a label is not cosmetic — direct labels are what make this
      // palette's green/brown pair legal for colour-blind readers.
      if (last) {
        const y = Math.min(Math.max(sy(last[1]), PAD.top + 6), PAD.top + IH)
        raw.push({ name: s.name, y, color: CHART_SERIES[i % CHART_SERIES.length] })
      }
    })
    raw.sort((a, b) => a.y - b.y)
    for (let i = 1; i < raw.length; i++) {
      if (raw[i].y - raw[i - 1].y < 14) raw[i].y = raw[i - 1].y + 14
    }
    // If nudging pushed the stack past the bottom, shift the whole stack up.
    const overflow = raw.length ? raw[raw.length - 1].y - (PAD.top + IH) : 0
    if (overflow > 0) raw.forEach((l) => (l.y -= overflow))
    return raw
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, isBar, scale])

  const barW = bars.length ? Math.min(56, (IW / bars.length) * 0.7) : 0

  return (
    <InteractiveShell title={title} notice={notice}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title}. ${notice}`}>
        {/* recessive grid */}
        {yTicks.map((t) => (
          <g key={`y${t}`}>
            <line x1={PAD.left} x2={PAD.left + IW} y1={sy(t)} y2={sy(t)} stroke={CHART_GRID} strokeWidth={1} />
            <text x={PAD.left - 8} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill={CHART_AXIS}>
              {fmt(t, unit)}
            </text>
          </g>
        ))}
        {xTicks.map((t) => (
          <text key={`x${t}`} x={sx(t)} y={PAD.top + IH + 18} textAnchor="middle" fontSize={11} fill={CHART_AXIS}>
            {fmt(t)}
          </text>
        ))}

        {/* axis lines */}
        <line x1={PAD.left} x2={PAD.left + IW} y1={PAD.top + IH} y2={PAD.top + IH} stroke={CHART_AXIS} strokeWidth={1} />
        <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + IH} stroke={CHART_AXIS} strokeWidth={1} />

        {xLabel && (
          <text x={PAD.left + IW / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={CHART_AXIS}>
            {xLabel}
          </text>
        )}
        {yLabel && (
          <text
            transform={`rotate(-90 14 ${PAD.top + IH / 2})`}
            x={14}
            y={PAD.top + IH / 2}
            textAnchor="middle"
            fontSize={11}
            fill={CHART_AXIS}
          >
            {yLabel}
          </text>
        )}

        {/* bars: 4px rounded top, 2px surface gap comes from the 0.7 width factor */}
        {isBar &&
          bars.map((b, i) => {
            const cx = PAD.left + (IW / bars.length) * (i + 0.5)
            const top = sy(Math.max(b.value, 0))
            const base = sy(0)
            const h = Math.max(Math.abs(base - top), 1)
            const c = CHART_SERIES[(b.color ?? i) % CHART_SERIES.length]
            return (
              <g key={b.label}>
                <rect
                  x={cx - barW / 2}
                  y={Math.min(top, base)}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={c}
                  onMouseEnter={() => setHover({ x: cx, y: Math.min(top, base), label: `${b.label}: ${fmt(b.value, unit)}` })}
                  onMouseLeave={() => setHover(null)}
                />
                <text x={cx} y={Math.min(top, base) - 6} textAnchor="middle" fontSize={11} fill={CHART_AXIS}>
                  {fmt(b.value, unit)}
                </text>
                <text x={cx} y={PAD.top + IH + 18} textAnchor="middle" fontSize={11} fill={CHART_AXIS}>
                  {b.label}
                </text>
              </g>
            )
          })}

        {/* area fills first, so lines sit on top */}
        {!isBar &&
          kind === 'area' &&
          series.map((s, i) => {
            const c = CHART_SERIES[i % CHART_SERIES.length]
            const d =
              `M ${sx(s.points[0][0])} ${sy(scale.y0)} ` +
              s.points.map((p) => `L ${sx(p[0])} ${sy(p[1])}`).join(' ') +
              ` L ${sx(s.points[s.points.length - 1][0])} ${sy(scale.y0)} Z`
            return <path key={`a${s.name}`} d={d} fill={c} opacity={0.12} />
          })}

        {!isBar &&
          series.map((s, i) => {
            const c = CHART_SERIES[i % CHART_SERIES.length]
            const isRef = Boolean(s.dashed || s.line)
            const showDots = s.dots ?? (kind === 'scatter' && !isRef)
            const showLine = kind !== 'scatter' || isRef
            const d = s.points.map((p, j) => `${j === 0 ? 'M' : 'L'} ${sx(p[0])} ${sy(p[1])}`).join(' ')
            return (
              <g key={s.name}>
                {showLine && (
                  <path d={d} fill="none" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={s.dashed ? '5 4' : undefined} />
                )}
                {showDots &&
                  s.points.map((p, j) => (
                    <circle
                      key={j}
                      cx={sx(p[0])}
                      cy={sy(p[1])}
                      r={4.5}
                      fill={c}
                      stroke="#fff"
                      strokeWidth={2}
                      onMouseEnter={() => setHover({ x: sx(p[0]), y: sy(p[1]), label: `${s.name}: (${fmt(p[0])}, ${fmt(p[1], unit)})` })}
                      onMouseLeave={() => setHover(null)}
                    />
                  ))}
              </g>
            )
          })}

        {/* markers: a labelled point the prose refers to */}
        {!isBar &&
          markers.map((m, i) => (
            <g key={`m${i}`}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={5} fill="none" stroke={CHART_AXIS} strokeWidth={1.5} />
              <text x={sx(m.x) + 8} y={sy(m.y) - 8} fontSize={11} fill={CHART_AXIS}>
                {m.text}
              </text>
            </g>
          ))}

        {/* direct labels — identity is never colour-alone */}
        {labels.map((l) => (
          <text key={l.name} x={PAD.left + IW + 8} y={l.y} dominantBaseline="middle" fontSize={11} fontWeight={600} fill={l.color}>
            {l.name}
          </text>
        ))}

        {hover && (
          <g pointerEvents="none">
            <rect
              x={Math.min(hover.x + 8, W - 8 - hover.label.length * 6.2)}
              y={hover.y - 26}
              width={hover.label.length * 6.2 + 12}
              height={20}
              rx={4}
              fill="#17191e"
              opacity={0.92}
            />
            <text
              x={Math.min(hover.x + 14, W - 2 - hover.label.length * 6.2)}
              y={hover.y - 12}
              fontSize={11}
              fill="#fff"
            >
              {hover.label}
            </text>
          </g>
        )}
        <desc id={uid}>{notice}</desc>
      </svg>
    </InteractiveShell>
  )
}
