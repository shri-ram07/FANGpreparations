import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'

// Ordered BPE merge list, hand-learned from a plausible mini corpus.
// Rank = position: earlier merges were more frequent in the corpus.
const MERGES: readonly (readonly [string, string])[] = [
  ['t', 'h'], // th
  ['th', 'e'], // the
  ['e', 'r'], // er
  ['o', 'r'], // or
  ['a', 'n'], // an
  ['i', 'n'], // in
  ['in', 'g'], // ing
  ['e', 'n'], // en
  ['t', 'o'], // to
  ['to', 'k'], // tok
  ['tok', 'en'], // token
  ['t', 'r'], // tr
  ['tr', 'an'], // tran
  ['tran', 's'], // trans
  ['f', 'or'], // for
  ['for', 'm'], // form
  ['form', 'er'], // former
  ['trans', 'former'], // transformer
  ['form', 's'], // forms
  ['trans', 'forms'], // transforms
  ['token', 's'], // tokens
  ['i', 's'], // is
  ['l', 'e'], // le
  ['a', 'r'], // ar
  ['le', 'ar'], // lear
  ['lear', 'n'], // learn
  ['learn', 'ing'], // learning
  ['i', 'z'], // iz
  ['iz', 'er'], // izer
]

// Tokens are letter-only (words split on spaces), so a space-joined key is safe.
const RANK = new Map(MERGES.map(([a, b], i) => [`${a} ${b}`, i]))

// Standard BPE encode restricted to the first `rules` merges: repeatedly find
// the lowest-rank adjacent pair present, merge every occurrence, until none apply.
function encodeWord(word: string, rules: number): string[] {
  let toks = word.split('')
  for (;;) {
    let best = -1
    for (let i = 0; i < toks.length - 1; i++) {
      const r = RANK.get(`${toks[i]} ${toks[i + 1]}`)
      if (r !== undefined && r < rules && (best === -1 || r < best)) best = r
    }
    if (best === -1) return toks
    const [a, b] = MERGES[best]!
    const out: string[] = []
    for (let i = 0; i < toks.length; i++) {
      if (i < toks.length - 1 && toks[i] === a && toks[i + 1] === b) {
        out.push(a + b)
        i++
      } else {
        out.push(toks[i]!)
      }
    }
    toks = out
  }
}

interface Tok {
  text: string
  isNew: boolean
}

interface Frame {
  words: Tok[][]
  note: string
  tokenCount: number
}

function simulate(text: string): Frame[] {
  const words = text.split(/\s+/).filter(Boolean)
  const frames: Frame[] = []
  // A token is "new" in frame k if no token covered the same char span in frame k-1.
  let prevSpans = new Set<string>()
  for (let k = 0; k <= MERGES.length; k++) {
    const spans = new Set<string>()
    let count = 0
    let fused = 0
    const ws = words.map((w, wi) => {
      let at = 0
      return encodeWord(w, k).map((t) => {
        const key = `${wi}:${at}:${t.length}`
        at += t.length
        spans.add(key)
        count++
        const isNew = k > 0 && t.length > 1 && !prevSpans.has(key)
        if (isNew) fused++
        return { text: t, isNew }
      })
    })
    const note =
      k === 0
        ? `Start: every word shattered into single characters. ${MERGES.length} learned merges to apply, most frequent first.`
        : `merge ${k}: '${MERGES[k - 1]![0]}' + '${MERGES[k - 1]![1]}' → '${MERGES[k - 1]![0] + MERGES[k - 1]![1]}'` +
          (fused > 0 ? ` — fused ${fused} spot${fused > 1 ? 's' : ''}` : ' — no occurrences in this text')
    frames.push({ words: ws, note, tokenCount: count })
    prevSpans = spans
  }
  return frames
}

const SAMPLES = ['the transformer transforms tokens', 'the tokenizer is learning', 'zyxwv quartz']

export default function TokenizerDemo() {
  const [text, setText] = useState(SAMPLES[0]!)
  const frames = useMemo(() => simulate(text), [text])
  const stepper = useStepper(frames.length, 500)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const f = frames[stepper.step]!
  const chars = text.replace(/\s/g, '').length

  // running token index across words, for alternating chip tints
  const offsets: number[] = []
  let acc = 0
  for (const w of f.words) {
    offsets.push(acc)
    acc += w.length
  }

  return (
    <InteractiveShell
      title="How text becomes tokens, merge by merge"
      notice="Frequent substrings fuse into whole tokens while rare words stay shattered — the model never sees the letters inside 'transformer', which is why LLMs are weirdly bad at counting letters in common words."
      onReset={() => {
        setText(SAMPLES[0]!)
        reset()
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Try:</span>
        {SAMPLES.map((s) => (
          <button
            key={s}
            onClick={() => setText(s)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              s === text ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value.toLowerCase().replace(/[^a-z ]/g, ''))}
        spellCheck={false}
        aria-label="Text to tokenize (lowercase letters and spaces)"
        className="mb-3 w-full rounded-md border border-line bg-bg px-2.5 py-1.5 font-mono text-sm text-ink focus:border-accent focus:outline-none"
      />

      <div className="flex min-h-20 flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border border-line bg-raised p-3">
        {f.words.length === 0 && <span className="text-xs text-ink-soft">type something above</span>}
        {f.words.map((toks, wi) => (
          <span key={wi} className="inline-flex flex-wrap gap-0.5">
            {toks.map((t, ti) => {
              const gi = offsets[wi]! + ti
              return (
                <span
                  key={ti}
                  className="rounded border px-1.5 py-0.5 font-mono text-[13px] leading-5 text-ink"
                  style={
                    t.isNew
                      ? { background: 'rgba(245,163,0,0.28)', borderColor: '#F5A300' }
                      : { background: `rgba(36,80,229,${gi % 2 ? 0.14 : 0.06})`, borderColor: 'transparent' }
                  }
                >
                  {t.text}
                </span>
              )
            })}
          </span>
        ))}
      </div>

      <p className="my-2 min-h-10 font-mono text-[13px] text-ink">{f.note}</p>

      <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span className="text-ink">
          {chars} chars → {f.tokenCount} tokens
        </span>
        {f.tokenCount > 0 && <span>{(chars / f.tokenCount).toFixed(1)}× compression</span>}
        <span>
          merges applied: {stepper.step}/{MERGES.length}
        </span>
        <span>spaces = word boundaries, not tokens</span>
      </div>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
