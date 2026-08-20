import { useState } from 'react'
import { useNavigate } from 'react-router'
import { SUBJECTS } from '@/content/registry'
import { GRAPH_POS, NODE_H, NODE_W, TRACK_LABELS } from '@/content/graph'
import { useApp } from '@/stores/app'

export function Component() {
  const navigate = useNavigate()
  const completed = useApp((s) => s.completed)
  const [hover, setHover] = useState<string | null>(null)

  const edges = SUBJECTS.flatMap((s) => s.prereqs.map((p) => ({ from: p, to: s.id })))

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-bold">Subject map</h1>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        Learn in dependency order — each layer feeds the next. Hover a subject to see what it builds on; click to
        enter.
      </p>

      <svg viewBox="0 0 720 740" className="mt-6 h-auto w-full select-none">
        <defs>
          <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#B9BDB4" />
          </marker>
          <marker id="arrow-hot" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L8,4 L0,8 z" fill="#2450E5" />
          </marker>
        </defs>

        {TRACK_LABELS.map((t) => (
          <text key={t.text} x={t.x} y={t.y} textAnchor="middle" fontSize={10.5} fill="#5A5F6A">
            {t.text}
          </text>
        ))}

        {edges.map(({ from, to }) => {
          const a = GRAPH_POS[from]
          const b = GRAPH_POS[to]
          const hot = hover === to || hover === from
          const x1 = a.x
          const y1 = a.y + NODE_H / 2
          const x2 = b.x
          const y2 = b.y - NODE_H / 2 - 6
          const my = (y1 + y2) / 2
          return (
            <path
              key={`${from}-${to}`}
              d={`M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`}
              fill="none"
              stroke={hot ? '#2450E5' : '#D8DBD3'}
              strokeWidth={hot ? 2 : 1.25}
              markerEnd={hot ? 'url(#arrow-hot)' : 'url(#arrow)'}
            />
          )
        })}

        {SUBJECTS.map((s) => {
          const p = GRAPH_POS[s.id]
          const total = s.modules.length
          const done = s.modules.filter((m) => completed[m.id]).length
          const pct = total === 0 ? 0 : done / total
          const isHover = hover === s.id
          const isPrereqOfHover = hover !== null && SUBJECTS.find((x) => x.id === hover)?.prereqs.includes(s.id)
          return (
            <g
              key={s.id}
              transform={`translate(${p.x - NODE_W / 2}, ${p.y - NODE_H / 2})`}
              className="cursor-pointer"
              onMouseEnter={() => setHover(s.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => void navigate(`/subject/${s.id}`)}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={isHover ? '#F6F7F4' : '#FFFFFF'}
                stroke={isHover || isPrereqOfHover ? '#2450E5' : pct === 1 ? '#178A50' : '#E4E6E1'}
                strokeWidth={isHover || isPrereqOfHover ? 2 : 1.25}
              />
              <text x={12} y={24} fontSize={12.5} fontWeight={600} fill="#17191E" fontFamily="Space Grotesk, sans-serif">
                {s.title}
              </text>
              <text x={12} y={40} fontSize={9.5} fill="#5A5F6A" fontFamily="JetBrains Mono, monospace">
                {total === 0 ? 'modules soon' : `${done}/${total} modules`}
              </text>
              {total > 0 && (
                <>
                  <rect x={12} y={46} width={NODE_W - 24} height={3.5} rx={1.75} fill="#F6F7F4" />
                  <rect x={12} y={46} width={(NODE_W - 24) * pct} height={3.5} rx={1.75} fill="#F5A300" />
                </>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
