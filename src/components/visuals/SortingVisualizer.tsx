import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS, CHART_GRID } from './shell/colors'

type Algo = 'bubble' | 'insertion' | 'merge' | 'quick'
const ALGOS: Algo[] = ['bubble', 'insertion', 'merge', 'quick']

interface Frame {
  bars: number[]
  compare: [number, number] | null
  swapped: boolean
  settled: number[]
  note: string
  comparisons: number
  swaps: number
}

function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function simulate(algorithm: Algo, base: number[]): Frame[] {
  const a = [...base]
  const n = a.length
  const settled = new Set<number>()
  let comparisons = 0
  let swaps = 0
  const frames: Frame[] = []
  const push = (note: string, compare: [number, number] | null = null, swapped = false) =>
    frames.push({ bars: [...a], compare, swapped, settled: Array.from(settled), note, comparisons, swaps })
  const swap = (x: number, y: number) => {
    const t = a[x]!
    a[x] = a[y]!
    a[y] = t
    swaps++
  }

  push(`${algorithm} sort, ${n} values. Step through and count the work.`)

  if (algorithm === 'bubble') {
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < n - 1 - i; j++) {
        comparisons++
        if (a[j]! > a[j + 1]!) {
          swap(j, j + 1)
          push(`a[${j}]=${a[j + 1]} > a[${j + 1}]=${a[j]} — swap`, [j, j + 1], true)
        } else {
          push(`a[${j}]=${a[j]} ≤ a[${j + 1}]=${a[j + 1]} — leave`, [j, j + 1])
        }
      }
      settled.add(n - 1 - i)
      push(`pass ${i + 1} done — the max bubbled to index ${n - 1 - i}, settled`)
    }
    settled.add(0)
  } else if (algorithm === 'insertion') {
    for (let i = 1; i < n; i++) {
      let j = i
      while (j > 0) {
        comparisons++
        if (a[j - 1]! > a[j]!) {
          swap(j - 1, j)
          push(`a[${j - 1}] > a[${j}] — shift ${a[j - 1]} left`, [j - 1, j], true)
          j--
        } else {
          push(`a[${j - 1}]=${a[j - 1]} ≤ a[${j}]=${a[j]} — ${a[j]} is inserted`, [j - 1, j])
          break
        }
      }
    }
    for (let i = 0; i < n; i++) settled.add(i)
  } else if (algorithm === 'merge') {
    const mergeSort = (lo: number, hi: number): void => {
      if (lo >= hi) return
      const mid = (lo + hi) >> 1
      mergeSort(lo, mid)
      mergeSort(mid + 1, hi)
      const left = a.slice(lo, mid + 1)
      const right = a.slice(mid + 1, hi + 1)
      let i = 0
      let j = 0
      let k = lo
      while (i < left.length && j < right.length) {
        comparisons++
        const fromLeft = left[i]! <= right[j]!
        const v = fromLeft ? left[i++]! : right[j++]!
        a[k] = v
        swaps++
        push(`merge [${lo}..${hi}]: ${v} wins the compare — write a[${k}]`, [k, k], true)
        k++
      }
      while (i < left.length) {
        a[k] = left[i++]!
        swaps++
        push(`merge [${lo}..${hi}]: left run leftover ${a[k]} — write a[${k}]`, [k, k], true)
        k++
      }
      while (j < right.length) {
        a[k] = right[j++]!
        swaps++
        push(`merge [${lo}..${hi}]: right run leftover ${a[k]} — write a[${k}]`, [k, k], true)
        k++
      }
    }
    mergeSort(0, n - 1)
    for (let i = 0; i < n; i++) settled.add(i)
  } else {
    const qs = (lo: number, hi: number): void => {
      if (lo > hi) return
      if (lo === hi) {
        settled.add(lo)
        push(`a[${lo}]=${a[lo]} is a one-element partition — settled`)
        return
      }
      const pivot = a[hi]!
      let i = lo
      for (let j = lo; j < hi; j++) {
        comparisons++
        if (a[j]! < pivot) {
          if (i !== j) {
            swap(i, j)
            push(`a[${j}] < pivot ${pivot} — swap it into the left side (a[${i}])`, [i, j], true)
          } else {
            push(`a[${j}]=${a[j]} < pivot ${pivot} — already on the left side`, [j, hi])
          }
          i++
        } else {
          push(`a[${j}]=${a[j]} ≥ pivot ${pivot} — stays on the right side`, [j, hi])
        }
      }
      if (i !== hi) swap(i, hi)
      settled.add(i)
      push(`pivot ${pivot} lands at its final index ${i} — settled`, [i, i], i !== hi)
      qs(lo, i - 1)
      qs(i + 1, hi)
    }
    qs(0, n - 1)
  }

  push(`sorted — ${comparisons} comparisons, ${swaps} ${algorithm === 'merge' ? 'writes' : 'swaps'}, ${frames.length + 1} steps total.`)
  return frames
}

export default function SortingVisualizer({
  algorithm = 'bubble',
  n = 12,
}: {
  algorithm?: Algo
  n?: number
}) {
  const [algo, setAlgo] = useState<Algo>(algorithm)

  const base = useMemo(() => {
    const rand = mulberry32(1234)
    return Array.from({ length: n }, () => 5 + Math.floor(rand() * 91))
  }, [n])

  const all = useMemo(
    () => ({
      bubble: simulate('bubble', base),
      insertion: simulate('insertion', base),
      merge: simulate('merge', base),
      quick: simulate('quick', base),
    }),
    [base],
  )

  const frames = all[algo]
  const stepper = useStepper(frames.length, 350)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algo])

  const f = frames[stepper.step]!
  const m = 20
  const gap = 6
  const barW = (600 - 2 * m - (n - 1) * gap) / n
  const B = 250

  return (
    <InteractiveShell
      title="Four sorts, one array"
      notice="Same array, count the total steps — bubble vs merge is the O(n²) vs O(n log n) story made physical."
      onReset={() => {
        setAlgo(algorithm)
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {ALGOS.map((k) => (
          <button
            key={k}
            onClick={() => setAlgo(k)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              k === algo ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <svg viewBox="0 0 600 260" className="h-auto w-full select-none">
        <text x={m} y={14} fontSize={10.5} fill={CHART_AXIS}>
          green = settled · blue outline = comparing · orange flash = swap/write
        </text>
        <text x={600 - m} y={14} textAnchor="end" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
          comparisons: {f.comparisons} · {algo === 'merge' ? 'writes' : 'swaps'}: {f.swaps}
        </text>
        <line x1={m} y1={B} x2={600 - m} y2={B} stroke={CHART_GRID} />
        {f.bars.map((v, i) => {
          const x = m + i * (barW + gap)
          const h = v * 2.1
          const inCompare = f.compare !== null && (f.compare[0] === i || f.compare[1] === i)
          const isSettled = f.settled.includes(i)
          const fill = inCompare && f.swapped ? '#F5A300' : isSettled ? '#178A50' : '#F6F7F4'
          return (
            <g key={i}>
              <rect
                x={x}
                y={B - h}
                width={barW}
                height={h}
                rx={3}
                fill={fill}
                stroke={inCompare ? '#2450E5' : isSettled ? 'none' : '#E4E6E1'}
                strokeWidth={inCompare ? 2 : 1}
              />
              <text
                x={x + barW / 2}
                y={B - h - 5}
                textAnchor="middle"
                fontSize={9}
                fontFamily="JetBrains Mono, monospace"
                fill="#5A5F6A"
              >
                {v}
              </text>
            </g>
          )
        })}
      </svg>

      <p className={`my-2 min-h-10 font-mono text-[13px] ${stepper.atEnd ? 'text-correct' : 'text-ink'}`}>{f.note}</p>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink-soft">
        <span>total steps —</span>
        {ALGOS.map((k) => (
          <span key={k} className={k === algo ? 'font-medium text-ink' : ''}>
            {k}: {all[k].length}
          </span>
        ))}
      </div>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
