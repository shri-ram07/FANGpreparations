import { useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS } from './shell/colors'

// Hand-authored candidate distribution, already sorted desc (temperature
// preserves order, so no re-sort is ever needed). Normalized in pipeline().
const CANDIDATES: { token: string; p: number }[] = [
  { token: ' Paris', p: 0.68 },
  { token: ' the', p: 0.07 },
  { token: ' a', p: 0.05 },
  { token: ' located', p: 0.04 },
  { token: ' Lyon', p: 0.03 },
  { token: ' France', p: 0.03 },
  { token: ' one', p: 0.03 },
  { token: ' beautiful', p: 0.02 },
  { token: ' known', p: 0.02 },
  { token: ' home', p: 0.015 },
  { token: ' also', p: 0.015 },
  { token: ' Marseille', p: 0.01 },
]

interface Row {
  token: string
  /** probability after temperature softmax, before any cutoff */
  temp: number
  cut: 'top-k' | 'top-p' | null
  /** renormalized probability among survivors (0 if cut) */
  renorm: number
}

function pipeline(temperature: number, topK: number, topP: number): Row[] {
  const sum0 = CANDIDATES.reduce((s, c) => s + c.p, 0)
  // logits = log p / T, then softmax (max-subtracted for stability)
  const logits = CANDIDATES.map((c) => Math.log(c.p / sum0) / temperature)
  const m = Math.max(...logits)
  const exps = logits.map((l) => Math.exp(l - m))
  const z = exps.reduce((a, b) => a + b, 0)
  const rows: Row[] = CANDIDATES.map((c, i) => ({ token: c.token, temp: exps[i]! / z, cut: null, renorm: 0 }))

  // top-k: keep the k most likely
  rows.forEach((r, i) => {
    if (i >= topK) r.cut = 'top-k'
  })

  // top-p over the top-k survivors: smallest prefix whose cumulative mass ≥ p
  const kept = rows.filter((r) => r.cut === null)
  const kz = kept.reduce((s, r) => s + r.temp, 0)
  let cum = 0
  kept.forEach((r, i) => {
    if (i > 0 && cum >= topP - 1e-9) r.cut = 'top-p'
    cum += r.temp / kz
  })

  const survivors = rows.filter((r) => r.cut === null)
  const sz = survivors.reduce((s, r) => s + r.temp, 0)
  for (const r of survivors) r.renorm = r.temp / sz
  return rows
}

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

const SEED = 20260819
const ROW_H = 22
const BAR_X = 118
const BAR_MAX = 396

export default function NextTokenSampler() {
  const [temperature, setTemperature] = useState(1)
  const [topK, setTopK] = useState(12)
  const [topP, setTopP] = useState(1)
  const [samples, setSamples] = useState<string[]>([])
  const rng = useRef(mulberry32(SEED))

  const rows = useMemo(() => pipeline(temperature, topK, topP), [temperature, topK, topP])
  const survivors = rows.filter((r) => r.cut === null)

  const sampleOne = () => {
    const u = rng.current()
    let acc = 0
    for (const r of survivors) {
      acc += r.renorm
      if (u < acc) {
        setSamples((s) => [...s, r.token])
        return
      }
    }
    setSamples((s) => [...s, survivors[survivors.length - 1]!.token])
  }

  const regime =
    survivors.length === 1 || survivors[0]!.renorm > 0.995
      ? { text: 'effectively greedy — one survivor takes it all', color: '#178A50' }
      : temperature > 1.3
        ? { text: `flattened — the tail is now plausible (${survivors.length} survivors)`, color: '#B45309' }
        : { text: `sampling among ${survivors.length} survivors`, color: '#5A5F6A' }

  return (
    <InteractiveShell
      title="Sampling the next token"
      notice="Temperature reshapes the hill, top-k/top-p fence off the tail, sampling rolls the dice — drag temperature to 0.05 and Sample repeatedly: every draw is ' Paris', which is exactly greedy decoding."
      onReset={() => {
        setTemperature(1)
        setTopK(12)
        setTopP(1)
        setSamples([])
        rng.current = mulberry32(SEED)
      }}
    >
      <p className="mb-3 font-mono text-[13px]">
        <span className="text-ink-soft">prompt: </span>The capital of France is
        <span className="text-accent">▮</span>
      </p>

      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        {rows.map((r, i) => {
          const y = 4 + i * ROW_H
          const alive = r.cut === null
          const len = Math.max(1.5, (alive ? r.renorm : r.temp) * BAR_MAX)
          const pct = ((alive ? r.renorm : r.temp) * 100).toFixed(1)
          return (
            <g key={r.token}>
              <text x={BAR_X - 8} y={y + 14} textAnchor="end" fontSize={11} fontFamily="JetBrains Mono, monospace" fill={alive ? '#17191E' : CHART_AXIS}>
                &apos;{r.token}&apos;
              </text>
              <rect
                x={BAR_X}
                y={y + 3}
                width={len}
                height={15}
                rx={2}
                fill={alive ? '#2450E5' : '#F6F7F4'}
                stroke={alive ? 'none' : '#E4E6E1'}
              />
              <text x={BAR_X + len + 6} y={y + 14} fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={alive ? '#17191E' : CHART_AXIS}>
                {pct}%{!alive && ` · cut by ${r.cut}`}
              </text>
            </g>
          )
        })}
        <text x={4} y={292} fontSize={10.5} fill={CHART_AXIS}>
          order: temperature reshapes logits → top-k keeps the k most likely → top-p keeps the smallest set reaching p → survivors renormalized
        </text>
      </svg>

      <div className="mt-2 space-y-2">
        {(
          [
            { label: 'temperature', min: 0.05, max: 2, step: 0.05, value: temperature, set: setTemperature, fmt: temperature.toFixed(2) },
            { label: 'top-k', min: 1, max: 12, step: 1, value: topK, set: setTopK, fmt: String(topK) },
            { label: 'top-p', min: 0.05, max: 1, step: 0.05, value: topP, set: setTopP, fmt: topP.toFixed(2) },
          ] as const
        ).map((s) => (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-xs text-ink-soft">{s.label}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.set(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <span className="w-10 text-right font-mono text-sm">{s.fmt}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={sampleOne}
          className="rounded-md border border-accent bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Sample one
        </button>
        <button
          onClick={() => setSamples([])}
          disabled={samples.length === 0}
          className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          Clear samples
        </button>
        <span className="font-mono text-xs font-medium" style={{ color: regime.color }}>
          {regime.text}
        </span>
      </div>

      <div className="mt-2 flex min-h-7 flex-wrap items-center gap-1.5">
        <span className="text-xs text-ink-soft">sampled so far:</span>
        {samples.length === 0 ? (
          <span className="text-xs text-ink-soft">— nothing yet</span>
        ) : (
          samples.map((t, i) => (
            <span key={i} className="rounded-full border border-line px-2 py-0.5 font-mono text-xs whitespace-pre">
              &apos;{t}&apos;
            </span>
          ))
        )}
      </div>
    </InteractiveShell>
  )
}
