import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

interface Frame {
  lo: number
  hi: number
  mid: number | null
  state: 'start' | 'left' | 'right' | 'found' | 'absent'
  note: string
  comparisons: number
}

function simulate(a: number[], target: number): Frame[] {
  const frames: Frame[] = [
    {
      lo: 0,
      hi: a.length - 1,
      mid: null,
      state: 'start',
      note: `Search ${target} among ${a.length} sorted values. lo=0, hi=${a.length - 1}.`,
      comparisons: 0,
    },
  ]
  let lo = 0
  let hi = a.length - 1
  let comparisons = 0
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    comparisons++
    const v = a[mid]!
    if (v === target) {
      frames.push({ lo, hi, mid, state: 'found', note: `a[${mid}] = ${v} — found in ${comparisons} comparisons.`, comparisons })
      return frames
    }
    if (v < target) {
      frames.push({ lo, hi, mid, state: 'right', note: `a[${mid}] = ${v} < ${target} → everything left of mid is too small. lo = ${mid + 1}.`, comparisons })
      lo = mid + 1
    } else {
      frames.push({ lo, hi, mid, state: 'left', note: `a[${mid}] = ${v} > ${target} → everything right of mid is too big. hi = ${mid - 1}.`, comparisons })
      hi = mid - 1
    }
  }
  frames.push({ lo, hi, mid: null, state: 'absent', note: `lo crossed hi — ${target} is not in the array. ${comparisons} comparisons.`, comparisons })
  return frames
}

const DEFAULT_ARRAY = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
const DEFAULT_TARGETS = [23, 2, 90]

export default function BinarySearchStepper({
  array = DEFAULT_ARRAY,
  targets = DEFAULT_TARGETS,
}: {
  array?: number[]
  targets?: number[]
}) {
  const [target, setTarget] = useState(targets[0]!)
  const frames = useMemo(() => simulate(array, target), [array, target])
  const stepper = useStepper(frames.length)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])

  const f = frames[stepper.step]!
  const n = array.length
  const cellW = Math.min(48, 520 / n)
  const gap = 4
  const rowW = n * (cellW + gap) - gap
  const x0 = (600 - rowW) / 2

  // pointer labels grouped per index (lo/mid/hi can coincide)
  const labels = new Map<number, string[]>()
  if (f.state !== 'absent') {
    const add = (i: number, name: string) => labels.set(i, [...(labels.get(i) ?? []), name])
    add(f.lo, 'lo')
    if (f.mid !== null) add(f.mid, 'mid')
    add(f.hi, 'hi')
  }

  return (
    <InteractiveShell
      title="Binary search, one comparison at a time"
      notice={`Count the comparisons — ${n} values need at most ${Math.floor(Math.log2(n)) + 1}. A million values need only 20. That is what O(log n) feels like.`}
      onReset={() => {
        setTarget(targets[0]!)
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Target:</span>
        {targets.map((t) => (
          <button
            key={t}
            onClick={() => setTarget(t)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              t === target ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {t}
            {!array.includes(t) && ' (absent)'}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 132" className="h-auto w-full select-none">
        {array.map((v, i) => {
          const x = x0 + i * (cellW + gap)
          const inRange = f.state !== 'absent' && i >= f.lo && i <= f.hi
          const isMid = f.mid === i
          const isFound = isMid && f.state === 'found'
          return (
            <g key={i}>
              {/* pointer labels above */}
              {labels.has(i) && (
                <text x={x + cellW / 2} y={20} textAnchor="middle" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={isMid ? '#2450E5' : CHART_AXIS}>
                  {labels.get(i)!.join('·')}
                </text>
              )}
              <rect
                x={x}
                y={28}
                width={cellW}
                height={42}
                rx={6}
                fill={isFound ? '#178A50' : isMid ? '#2450E5' : inRange ? '#FFFFFF' : '#F6F7F4'}
                stroke={isMid || isFound ? 'none' : '#E4E6E1'}
              />
              <text
                x={x + cellW / 2}
                y={54}
                textAnchor="middle"
                fontSize={14}
                fontFamily="JetBrains Mono, monospace"
                fill={isMid || isFound ? '#FFFFFF' : inRange ? '#17191E' : '#B9BDB4'}
              >
                {v}
              </text>
              <text x={x + cellW / 2} y={84} textAnchor="middle" fontSize={9.5} fill={inRange ? CHART_AXIS : '#C9CCC3'}>
                {i}
              </text>
            </g>
          )
        })}
        <text x={x0} y={112} fontSize={10.5} fill={CHART_AXIS}>
          eliminated values are grayed out
        </text>
        <text x={600 - x0} y={112} textAnchor="end" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
          comparisons: {f.comparisons}
        </text>
      </svg>

      <p className={`my-2 min-h-10 font-mono text-[13px] ${f.state === 'found' ? 'text-correct' : f.state === 'absent' ? 'text-wrong' : 'text-ink'}`}>
        {f.note}
      </p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
