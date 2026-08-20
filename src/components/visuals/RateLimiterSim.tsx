import { useEffect, useReducer, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

type Pattern = 'steady' | 'burst' | 'ramp'

interface Dot {
  id: number
  x: number
  y: number
  phase: 'in' | 'ok' | 'fall'
  slot: number
}

interface Sim {
  t: number
  tokens: number
  accepted: number
  rejected: number
  accum: number
  nextId: number
  dots: Dot[]
}

type Action = { type: 'tick'; refill: number; pattern: Pattern } | { type: 'reset' }

const TICK = 0.1 // s per tick
const CAP = 10
const SPEED = 13 // px per tick (130 px/s on the conveyor)
const CONVEY_Y = 140
const TANK_X = 350
const TANK_W = 52
const TANK_TOP = 36
const TANK_BOT = 252
const TANK_H = TANK_BOT - TANK_TOP
const ARRIVE_X = TANK_X - 10
const PASS_X = TANK_X + TANK_W + 10
const PILE_MAX = 24 // pile slots drawn; beyond that a +N label

const slotPos = (i: number): [number, number] => [234 + (i % 8) * 13, 285 - Math.floor(i / 8) * 13]

const rampRate = (t: number) => Math.min(10, 0.5 + 0.8 * t)

const INITIAL: Sim = { t: 0, tokens: CAP, accepted: 0, rejected: 0, accum: 0, nextId: 0, dots: [] }

function reduce(s: Sim, a: Action): Sim {
  if (a.type === 'reset') return INITIAL
  const t = s.t + TICK
  let tokens = Math.min(CAP, s.tokens + a.refill * TICK)
  let accum = s.accum
  let spawn = 0
  if (a.pattern === 'burst') {
    // 15 arrivals in one tick, repeating every 8 s so the refill recovery is visible
    if (s.t === 0 || Math.floor(t / 8) > Math.floor(s.t / 8)) spawn = 15
  } else {
    accum += (a.pattern === 'steady' ? 3 : rampRate(t)) * TICK
    spawn = Math.floor(accum)
    accum -= spawn
  }

  let accepted = s.accepted
  let rejected = s.rejected
  const dots: Dot[] = []
  for (const d of s.dots) {
    if (d.phase === 'in') {
      const x = d.x + SPEED
      if (x >= ARRIVE_X) {
        if (tokens >= 1) {
          tokens -= 1
          accepted++
          dots.push({ ...d, x: PASS_X, phase: 'ok' })
        } else {
          rejected++
          dots.push({ ...d, x: ARRIVE_X, phase: 'fall', slot: Math.min(rejected - 1, PILE_MAX - 1) })
        }
      } else dots.push({ ...d, x })
    } else if (d.phase === 'ok') {
      const x = d.x + SPEED
      if (x < 615) dots.push({ ...d, x })
    } else {
      const [tx, ty] = slotPos(d.slot)
      const nx = d.x + (tx - d.x) * 0.3
      const ny = d.y + (ty - d.y) * 0.35
      // landed dots are dropped — the static pile grid renders them from the counter
      if (Math.abs(ty - ny) > 1.5 || Math.abs(tx - nx) > 1.5) dots.push({ ...d, x: nx, y: ny })
    }
  }
  let nextId = s.nextId
  for (let i = 0; i < spawn; i++) dots.push({ id: nextId++, x: 8 - i * 13, y: CONVEY_Y, phase: 'in', slot: 0 })
  return { t, tokens, accepted, rejected, accum, nextId, dots }
}

const PATTERNS: { key: Pattern; label: string }[] = [
  { key: 'steady', label: 'steady 3/s' },
  { key: 'burst', label: 'burst of 15' },
  { key: 'ramp', label: 'ramp up' },
]

export default function RateLimiterSim() {
  const [refill, setRefill] = useState(2)
  const [pattern, setPattern] = useState<Pattern>('steady')
  const [playing, setPlaying] = useState(true)
  const [sim, dispatch] = useReducer(reduce, INITIAL)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => dispatch({ type: 'tick', refill, pattern }), 100)
    return () => clearInterval(id)
  }, [playing, refill, pattern])

  const fillTop = TANK_BOT - (sim.tokens / CAP) * TANK_H
  const levelY = Math.min(Math.max(fillTop - 6, TANK_TOP + 12), TANK_BOT - 6)
  const falling = sim.dots.filter((d) => d.phase === 'fall').length
  const piled = Math.min(sim.rejected - falling, PILE_MAX)

  return (
    <InteractiveShell
      title="Token bucket rate limiter"
      notice="A burst drains the bucket in one gulp — capacity is the burst allowance, refill rate is the sustained ceiling; after the gulp, everything above the refill rate bounces."
      onReset={() => {
        setRefill(2)
        setPattern('steady')
        setPlaying(true)
        dispatch({ type: 'reset' })
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Pattern:</span>
        {PATTERNS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPattern(p.key)
              dispatch({ type: 'reset' })
            }}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              p.key === pattern ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        {/* conveyor */}
        <line x1={4} y1={CONVEY_Y + 8} x2={ARRIVE_X} y2={CONVEY_Y + 8} stroke={CHART_GRID} strokeWidth={2} />
        <line x1={PASS_X} y1={CONVEY_Y + 8} x2={596} y2={CONVEY_Y + 8} stroke={CHART_GRID} strokeWidth={2} />
        <text x={8} y={CONVEY_Y - 14} fontSize={10.5} fill={CHART_AXIS}>
          requests →
        </text>
        <g>
          <circle cx={520} cy={CONVEY_Y - 18} r={4} fill="#178A50" />
          <text x={528} y={CONVEY_Y - 14} fontSize={10.5} fill={CHART_AXIS}>
            accepted →
          </text>
        </g>

        {/* tank */}
        <text x={TANK_X + TANK_W / 2} y={TANK_TOP - 12} textAnchor="middle" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
          ↓ +{refill.toFixed(1)}/s
        </text>
        <text x={TANK_X + TANK_W + 8} y={TANK_TOP + 4} fontSize={10.5} fill={CHART_AXIS}>
          capacity 10
        </text>
        <rect x={TANK_X + 1} y={fillTop} width={TANK_W - 2} height={TANK_BOT - fillTop} fill="rgba(36,80,229,0.75)" />
        <path d={`M${TANK_X} ${TANK_TOP} V${TANK_BOT} H${TANK_X + TANK_W} V${TANK_TOP}`} fill="none" stroke="#17191E" strokeWidth={2} />
        <text x={TANK_X + TANK_W / 2} y={levelY} textAnchor="middle" fontSize={13} fontFamily="JetBrains Mono, monospace" fill="#17191E">
          {sim.tokens.toFixed(1)}
        </text>

        {/* rejected pile */}
        <text x={224} y={289} textAnchor="end" fontSize={10.5} fill={CHART_AXIS}>
          rejected ↓
        </text>
        {Array.from({ length: Math.max(piled, 0) }, (_, i) => {
          const [px, py] = slotPos(i)
          return <circle key={i} cx={px} cy={py} r={4.5} fill="#D33A2C" />
        })}
        {sim.rejected > PILE_MAX && (
          <text x={340} y={289} fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
            +{sim.rejected - PILE_MAX} more
          </text>
        )}

        {/* moving request dots */}
        {sim.dots.map((d) => (
          <circle key={d.id} cx={d.x} cy={d.y} r={5} fill={d.phase === 'ok' ? '#178A50' : d.phase === 'fall' ? '#D33A2C' : '#5A5F6A'} />
        ))}
      </svg>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="shrink-0 rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-accent"
        >
          {playing ? '❚❚ pause' : '▶ play'}
        </button>
        <span className="shrink-0 font-mono text-xs text-ink-soft">refill rate</span>
        <input
          type="range"
          min={0.5}
          max={10}
          step={0.5}
          value={refill}
          onChange={(e) => setRefill(Number(e.target.value))}
          className="w-full accent-accent"
        />
        <span className="w-20 shrink-0 text-right font-mono text-sm">{refill.toFixed(1)} tok/s</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span>tokens {sim.tokens.toFixed(1)}/10</span>
        <span>accepted {sim.accepted}</span>
        <span>rejected {sim.rejected}</span>
        <span>t {sim.t.toFixed(1)}s</span>
        {pattern === 'ramp' && <span>arriving {rampRate(sim.t).toFixed(1)}/s</span>}
      </div>
    </InteractiveShell>
  )
}
