import { useMemo } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

// Generic step-through memory diagram, driven entirely by frame data from the
// content file. One component covers pointers, references, new/delete,
// dangling pointers, copy-vs-move, and Python name binding.
export interface MemCell {
  /** Referenced by stack entries via `to`. */
  id: string
  value: string
  label?: string
  /** Dashed red: memory that was delete'd/freed — arrows into it are bugs. */
  freed?: boolean
  /** Grayed: a moved-from object (valid but empty). */
  moved?: boolean
  /** Solid red: the cell still exists but its VALUE is the problem
   *  (a vanished gradient, an exploded loss, a leaked row). */
  danger?: boolean
}

export interface MemStackEntry {
  name: string
  /** Direct value (int x = 42) … */
  value?: string
  /** …or an arrow to a heap cell id (pointer/reference/name binding). */
  to?: string
  /** Render the arrow red-dashed (dangling/danger). */
  danger?: boolean
}

export interface MemFrame {
  note: string
  stack: MemStackEntry[]
  heap: MemCell[]
}

interface Props {
  frames: MemFrame[]
  title?: string
  notice?: string
  /** Column headers — defaults suit C++; Python content can pass names/objects. */
  leftLabel?: string
  rightLabel?: string
}

const BOX_H = 34
const GAP = 10
const TOP = 46
const S_X = 30
const S_W = 190
const H_X = 370
const H_W = 200

export default function PointerBoxDiagram({
  frames,
  title = 'Memory, drawn',
  notice = 'Watch which box each arrow points at — every pointer bug is an arrow pointing somewhere it should not.',
  leftLabel = 'stack',
  rightLabel = 'heap',
}: Props) {
  const stepper = useStepper(frames.length)
  const f = frames[Math.min(stepper.step, frames.length - 1)]!

  const height = useMemo(() => {
    const rows = Math.max(...frames.map((fr) => Math.max(fr.stack.length, fr.heap.length)), 1)
    return TOP + rows * (BOX_H + GAP) + 16
  }, [frames])

  const heapY = new Map(f.heap.map((c, i) => [c.id, TOP + i * (BOX_H + GAP)]))

  return (
    <InteractiveShell title={title} notice={notice} onReset={stepper.reset}>
      <svg viewBox={`0 0 600 ${height}`} className="h-auto w-full select-none">
        <text x={S_X + S_W / 2} y={26} textAnchor="middle" fontSize={11} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
          {leftLabel}
        </text>
        <text x={H_X + H_W / 2} y={26} textAnchor="middle" fontSize={11} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
          {rightLabel}
        </text>

        <defs>
          <marker id="mem-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#2450E5" />
          </marker>
          <marker id="mem-arrow-danger" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0,0 L8,4 L0,8 z" fill="#D33A2C" />
          </marker>
        </defs>

        {/* arrows under boxes */}
        {f.stack.map((s, i) => {
          if (!s.to) return null
          const y1 = TOP + i * (BOX_H + GAP) + BOX_H / 2
          const y2 = heapY.get(s.to)
          if (y2 === undefined) return null
          const danger = s.danger || f.heap.find((c) => c.id === s.to)?.freed
          return (
            <path
              key={`a${i}`}
              d={`M${S_X + S_W},${y1} C${S_X + S_W + 70},${y1} ${H_X - 70},${y2 + BOX_H / 2} ${H_X - 3},${y2 + BOX_H / 2}`}
              fill="none"
              stroke={danger ? '#D33A2C' : '#2450E5'}
              strokeWidth={1.75}
              strokeDasharray={danger ? '5 4' : undefined}
              markerEnd={danger ? 'url(#mem-arrow-danger)' : 'url(#mem-arrow)'}
            />
          )
        })}

        {/* stack entries */}
        {f.stack.map((s, i) => {
          const y = TOP + i * (BOX_H + GAP)
          return (
            <g key={`s${i}`}>
              <rect x={S_X} y={y} width={S_W} height={BOX_H} rx={6} fill="#FFFFFF" stroke="#E4E6E1" />
              <text x={S_X + 12} y={y + 22} fontSize={12.5} fontFamily="JetBrains Mono, monospace" fill="#17191E">
                {s.name}
                {s.value !== undefined ? ` = ${s.value}` : ''}
              </text>
            </g>
          )
        })}

        {/* heap cells */}
        {f.heap.map((c, i) => {
          const y = TOP + i * (BOX_H + GAP)
          return (
            <g key={c.id} opacity={c.moved ? 0.45 : 1}>
              <rect
                x={H_X}
                y={y}
                width={H_W}
                height={BOX_H}
                rx={6}
                fill={c.freed ? '#FFFFFF' : c.danger ? '#FDF2F0' : '#F6F7F4'}
                stroke={c.freed || c.danger ? '#D33A2C' : '#E4E6E1'}
                strokeWidth={c.danger ? 1.75 : 1}
                strokeDasharray={c.freed ? '5 4' : undefined}
              />
              <text
                x={H_X + 12}
                y={y + 22}
                fontSize={12.5}
                fontFamily="JetBrains Mono, monospace"
                fill={c.freed || c.danger ? '#D33A2C' : '#17191E'}
              >
                {c.value}
              </text>
              {(c.label || c.freed || c.moved) && (
                <text x={H_X + H_W - 8} y={y + 22} textAnchor="end" fontSize={9.5} fill={c.danger ? '#D33A2C' : CHART_AXIS}>
                  {c.freed ? 'freed' : c.moved ? 'moved-from' : c.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <p className="my-2 min-h-10 font-mono text-[13px]">{f.note}</p>
      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
