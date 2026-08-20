import { useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'

// One hand-built toy attention head. Scores come from explicit affinity rules
// (self, previous-word, and syntactic links) — illustrative of what a trained
// head produces, and honest about it in the module copy.
const TOKENS = ['The', 'cat', 'sat', 'on', 'the', 'mat', 'because', 'it', 'was', 'tired'] as const

const LINKS: Record<string, number> = {
  'it→cat': 3.6, // coreference — the star of the demo
  'it→mat': 1.1,
  'sat→cat': 2.6, // verb → subject
  'sat→mat': 1.3, // verb → location
  'tired→it': 2.4, // adjective → pronoun
  'tired→cat': 1.6, // ...and through it, the cat
  'mat→on': 1.6,
  'on→sat': 1.4,
  'was→it': 1.8,
  'because→sat': 1.2,
}

function rawScore(i: number, j: number): number {
  let s = 0.4 // base
  if (i === j) s += 1.6 // self
  if (j === i - 1) s += 1.0 // previous word
  s += LINKS[`${TOKENS[i]!.toLowerCase()}→${TOKENS[j]!.toLowerCase()}`] ?? 0
  return s
}

function buildMatrices(causal: boolean) {
  const n = TOKENS.length
  const scores = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => rawScore(i, j)))
  const weights = scores.map((row, i) => {
    const exps = row.map((s, j) => (causal && j > i ? 0 : Math.exp(s)))
    const sum = exps.reduce((a, b) => a + b, 0)
    return exps.map((e) => e / sum)
  })
  const maxScore = Math.max(...scores.flat())
  return { scores, weights, maxScore }
}

export default function AttentionHeatmap(_props: Record<string, never>) {
  const [q, setQ] = useState(7) // start on "it" — the money row
  const [view, setView] = useState<'weights' | 'scores'>('weights')
  const [causal, setCausal] = useState(false)
  const [hover, setHover] = useState<[number, number] | null>(null)

  const { scores, weights, maxScore } = useMemo(() => buildMatrices(causal), [causal])
  const n = TOKENS.length

  const cell = (i: number, j: number) =>
    view === 'weights' ? weights[i]![j]! : causal && j > i ? 0 : scores[i]![j]! / maxScore

  const [hi, hj] = hover ?? [q, null as number | null]

  return (
    <InteractiveShell
      title="Every token asks every other token: how much do you matter to me?"
      notice={`Hover "it" — one row of weights quietly answers "it refers to the cat". No rules were written for that; heads learn it. Then flip to raw scores to see what softmax did.`}
      onReset={() => {
        setQ(7)
        setView('weights')
        setCausal(false)
        setHover(null)
      }}
    >
      {/* sentence row — the query picker; weight lives inside each chip so it can't misalign */}
      <div className="mb-3 flex flex-wrap gap-1">
        {TOKENS.map((t, j) => {
          const w = cell(hi, j)
          const isQuery = j === hi
          return (
            <button
              key={j}
              onMouseEnter={() => setQ(j)}
              onFocus={() => setQ(j)}
              onClick={() => setQ(j)}
              className={`flex flex-col items-center rounded-md px-2 py-1 font-mono transition-shadow ${
                isQuery ? 'ring-2 ring-accent' : ''
              }`}
              style={{
                background: isQuery ? '#F6F7F4' : `rgba(36, 80, 229, ${Math.min(w * (view === 'weights' ? 1.6 : 1), 0.85).toFixed(3)})`,
              }}
            >
              <span className="text-sm" style={{ color: !isQuery && w > 0.28 ? '#fff' : '#17191E' }}>
                {t}
              </span>
              <span className="text-[10px]" style={{ color: !isQuery && w > 0.28 ? 'rgba(255,255,255,0.85)' : '#5A5F6A' }}>
                {isQuery ? 'Q' : w.toFixed(2)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(['weights', 'scores'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              view === v ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {v === 'weights' ? 'softmax weights (rows sum to 1)' : 'raw Q·K scores'}
          </button>
        ))}
        <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-ink-soft">
          <input type="checkbox" checked={causal} onChange={(e) => setCausal(e.target.checked)} />
          causal mask (GPT-style: no peeking at the future)
        </label>
      </div>

      {/* full heatmap: rows = queries, cols = keys. Sequential single hue. */}
      <div className="overflow-x-auto">
        <div className="inline-grid gap-px" style={{ gridTemplateColumns: `72px repeat(${n}, 30px)` }} onMouseLeave={() => setHover(null)}>
          <div />
          {TOKENS.map((t, j) => (
            <div key={j} className="relative h-12">
              <span className="absolute bottom-1 left-1/2 origin-bottom-left -rotate-45 font-mono text-[9.5px] whitespace-nowrap text-ink-soft">
                {t}
              </span>
            </div>
          ))}
          {TOKENS.map((t, i) => (
            <div key={i} className="contents">
              <div className={`pr-2 text-right font-mono text-[10.5px] leading-[30px] ${i === hi ? 'font-bold text-accent' : 'text-ink-soft'}`}>
                {t}
              </div>
              {TOKENS.map((_, j) => {
                const v = cell(i, j)
                const isHover = hover?.[0] === i && hover?.[1] === j
                return (
                  <div
                    key={j}
                    onMouseEnter={() => setHover([i, j])}
                    className={`h-[30px] w-[30px] cursor-crosshair ${isHover ? 'ring-2 ring-ink ring-inset' : ''} ${i === hi && !hover ? 'ring-1 ring-accent/50 ring-inset' : ''}`}
                    style={{ background: `rgba(36, 80, 229, ${Math.min(v * (view === 'weights' ? 1.6 : 1), 0.92).toFixed(3)})` }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2 min-h-5 font-mono text-xs text-ink-soft">
        {hj !== null && hover
          ? view === 'weights'
            ? `query "${TOKENS[hi]}" ← key "${TOKENS[hj]}": weight ${weights[hi]![hj]!.toFixed(3)} of "${TOKENS[hj]}"'s value gets mixed in`
            : `query "${TOKENS[hi]}" · key "${TOKENS[hj]}": raw score ${causal && hj > hi ? '−∞ (masked)' : scores[hi]![hj]!.toFixed(2)}`
          : `row "${TOKENS[hi]}" shown on the sentence above — hover any cell for the exact number`}
      </p>
    </InteractiveShell>
  )
}
