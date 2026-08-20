import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

// 18 requests: a warmup where B and C get evicted early and re-requested,
// then the stream settles into an A B C D loop — a working set of exactly 4.
// Capacity 3 thrashes on that loop (LRU evicts each key just before reuse);
// capacity 4 hits every time.
const STREAM = ['A', 'B', 'C', 'A', 'D', 'B', 'E', 'A', 'B', 'C', 'D', 'A', 'B', 'C', 'D', 'A', 'B', 'C']

interface Slot {
  key: string
  id: string // instance id (key + insertion count) so re-inserted keys animate independently
}

interface Frame {
  i: number
  slots: Slot[] // MRU → LRU
  event: 'hit' | 'miss' | 'evict'
  evicted?: string
  pile: Slot[] // eviction order, oldest first
  hits: number
  misses: number
  note: string
}

function simulate(capacity: number): Frame[] {
  const frames: Frame[] = []
  let slots: Slot[] = []
  const pile: Slot[] = []
  const born: Record<string, number> = {}
  let hits = 0
  let misses = 0
  STREAM.forEach((key, i) => {
    const at = slots.findIndex((s) => s.key === key)
    if (at >= 0) {
      hits++
      slots = [slots[at]!, ...slots.filter((_, j) => j !== at)]
      frames.push({ i, slots, event: 'hit', pile: [...pile], hits, misses, note: `${key} is in the cache — hit. It jumps back to the MRU slot.` })
    } else {
      misses++
      const wasEvicted = pile.some((p) => p.key === key)
      let evicted: string | undefined
      if (slots.length >= capacity) {
        const out = slots[slots.length - 1]!
        evicted = out.key
        pile.push(out)
        slots = slots.slice(0, -1)
      }
      const n = (born[key] ?? 0) + 1
      born[key] = n
      slots = [{ key, id: `${key}${n}` }, ...slots]
      frames.push({
        i,
        slots,
        event: evicted !== undefined ? 'evict' : 'miss',
        evicted,
        pile: [...pile],
        hits,
        misses,
        note:
          evicted !== undefined && wasEvicted
            ? `${key} misses — we evicted it earlier and pay again. LRU ${evicted} is evicted, ${key} inserted at MRU.`
            : evicted !== undefined
              ? `${key} not in cache — miss. Cache full: LRU ${evicted} is evicted, ${key} inserted at MRU.`
              : `${key} not in cache — miss. Inserted at MRU (cache not full yet).`,
      })
    }
  })
  return frames
}

const CHIP = 26
const GAP = 5
const STREAM_X0 = (600 - (STREAM.length * (CHIP + GAP) - GAP)) / 2
const STREAM_Y = 10
const SLOT_W = 64
const SLOT_H = 44
const SLOT_GAP = 12
const SLOT_Y = 82
const PILE_X0 = 96
const PILE_Y = 170

export default function CacheSimulator({ capacity = 3 }: { capacity?: number }) {
  const [cap, setCap] = useState(capacity)
  const frames = useMemo(() => simulate(cap), [cap])
  const stepper = useStepper(frames.length, 700)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cap])

  const f = frames[stepper.step]!
  const hitRate = f.hits / (f.i + 1)
  const slotX0 = (600 - (cap * (SLOT_W + SLOT_GAP) - SLOT_GAP)) / 2

  // one chip per cache/pile instance, keyed by instance id — CSS transform
  // transition makes hits jump to MRU, inserts shift the row, evictions drop
  const chips = [
    ...f.slots.map((s, j) => ({
      ...s,
      x: slotX0 + j * (SLOT_W + SLOT_GAP) + 6,
      y: SLOT_Y + 6,
      w: SLOT_W - 12,
      h: SLOT_H - 12,
      big: true,
      fill: j === 0 && f.event === 'hit' ? '#178A50' : j === 0 ? '#2450E5' : '#FFFFFF',
    })),
    ...f.pile.map((s, p) => ({
      ...s,
      x: PILE_X0 + p * (CHIP + GAP),
      y: PILE_Y,
      w: CHIP,
      h: CHIP,
      big: false,
      fill: f.event === 'evict' && p === f.pile.length - 1 ? '#D33A2C' : '#F6F7F4',
    })),
  ]

  return (
    <InteractiveShell
      title="LRU cache, one request at a time"
      notice="LRU bets that what you touched recently you will touch again — watch the hit rate jump the moment capacity fits the loop the stream keeps making."
      onReset={() => {
        setCap(capacity)
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Capacity:</span>
        {[2, 3, 4].map((c) => (
          <button
            key={c}
            onClick={() => setCap(c)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              c === cap ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 206" className="h-auto w-full select-none">
        {/* request stream ribbon: past muted, current ringed, future plain */}
        {STREAM.map((k, idx) => {
          const x = STREAM_X0 + idx * (CHIP + GAP)
          const past = idx < f.i
          const current = idx === f.i
          return (
            <g key={idx}>
              <rect
                x={x}
                y={STREAM_Y}
                width={CHIP}
                height={CHIP}
                rx={6}
                fill={past ? '#F6F7F4' : '#FFFFFF'}
                stroke={current ? '#2450E5' : '#E4E6E1'}
                strokeWidth={current ? 2 : 1}
              />
              <text x={x + CHIP / 2} y={STREAM_Y + 17.5} textAnchor="middle" fontSize={12} fontFamily="JetBrains Mono, monospace" fill={past ? '#B9BDB4' : '#17191E'}>
                {k}
              </text>
              {(past || current) && (
                <circle cx={x + CHIP / 2} cy={STREAM_Y + CHIP + 8} r={2.5} fill={frames[idx]!.event === 'hit' ? '#178A50' : '#D33A2C'} />
              )}
            </g>
          )
        })}

        {/* cache slots, MRU → LRU */}
        {Array.from({ length: cap }, (_, j) => {
          const x = slotX0 + j * (SLOT_W + SLOT_GAP)
          return (
            <g key={j}>
              {(j === 0 || j === cap - 1) && (
                <text x={x + SLOT_W / 2} y={SLOT_Y - 8} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
                  {j === 0 ? 'MRU' : 'LRU'}
                </text>
              )}
              <rect x={x} y={SLOT_Y} width={SLOT_W} height={SLOT_H} rx={8} fill="#F6F7F4" stroke="#E4E6E1" strokeDasharray="4 3" />
            </g>
          )
        })}

        {/* evicted pile */}
        <text x={PILE_X0 - 10} y={PILE_Y + 17} textAnchor="end" fontSize={10.5} fill={CHART_AXIS}>
          evicted →
        </text>

        {/* key chips (cache + pile), animated by instance identity */}
        {chips.map((c) => {
          const colored = c.fill !== '#FFFFFF' && c.fill !== '#F6F7F4'
          return (
            <g key={c.id} style={{ transform: `translate(${c.x}px, ${c.y}px)`, transition: 'transform 300ms ease' }}>
              <rect width={c.w} height={c.h} rx={6} fill={c.fill} stroke={colored ? 'none' : '#E4E6E1'} />
              <text
                x={c.w / 2}
                y={c.h / 2 + (c.big ? 5 : 4)}
                textAnchor="middle"
                fontSize={c.big ? 14 : 11}
                fontFamily="JetBrains Mono, monospace"
                fill={colored ? '#FFFFFF' : c.big ? '#17191E' : '#B9BDB4'}
              >
                {c.key}
              </text>
            </g>
          )
        })}
      </svg>

      <p className={`my-2 min-h-10 font-mono text-[13px] ${f.event === 'hit' ? 'text-correct' : f.event === 'evict' ? 'text-wrong' : 'text-ink'}`}>
        {f.note}
      </p>

      <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span>
          request {f.i + 1}/{STREAM.length}
        </span>
        <span className="text-correct">● {f.hits} hits</span>
        <span className="text-wrong">● {f.misses} misses</span>
        <span className="font-medium text-ink">hit rate {(hitRate * 100).toFixed(0)}%</span>
      </div>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
