import { Fragment, useEffect, useState } from 'react'
import type { ThemedToken } from 'shiki/core'
import { getHighlighter } from '@/lib/highlighter'
import type { CodeLang, CodeVariant } from '@/content/types'
import { useApp } from '@/stores/app'

interface Props {
  code: string
  lang: CodeLang
  title?: string
  /** 1-based line number -> note. Annotated lines get a marker; click toggles the note inline. */
  annotations?: Record<number, string>
  /** Python twin of the same algorithm. Present => the cpp | py switch renders. */
  py?: CodeVariant
}

// The un-highlighted <pre> is both the loading state and the error fallback —
// identical font metrics, so highlighting fades in with zero layout shift.
export function CodeBlock({ code, lang, title, annotations = {}, py }: Props) {
  // Both bits of view state are stamped with the variant they belong to, so a
  // language flip invalidates them during render — no reset effect, no frame
  // where the new code is paired with the old tokens or an old line note.
  const [hl, setHl] = useState<{ key: string; tokens: ThemedToken[][] } | null>(null)
  const [open, setOpen] = useState<{ key: string; line: number } | null>(null)
  // Notes are SHOWN BY DEFAULT. They used to be click-only, which meant a first
  // read saw bare code and none of the explanation. Collapsing is the opt-in now.
  const [showAll, setShowAll] = useState(true)

  // One preference for the whole site, persisted: a Python reader flips it once
  // and every block on every page follows, including after a reload.
  const codeLang = useApp((s) => s.codeLang)
  const setCodeLang = useApp((s) => s.setCodeLang)

  const showPy = py != null && codeLang === 'python'
  const activeCode = showPy ? py.code : code
  const activeLang: CodeLang = showPy ? 'python' : lang
  const activeAnnotations = (showPy ? py.annotations : annotations) ?? {}
  const noteCount = Object.keys(activeAnnotations).length

  const key = `${activeLang}\u0000${activeCode}`
  const tokens = hl?.key === key ? hl.tokens : null
  const openLine = open?.key === key ? open.line : null

  useEffect(() => {
    let live = true
    getHighlighter()
      .then((h) => {
        if (live) setHl({ key, tokens: h.codeToTokens(activeCode, { lang: activeLang, theme: 'github-light' }).tokens })
      })
      .catch(() => {}) // plain <pre> stays — never blank the code
    return () => {
      live = false
    }
  }, [key, activeCode, activeLang])

  const plainLines = activeCode.split('\n')
  const lineCount = tokens ? tokens.length : plainLines.length

  return (
    <figure className="my-4">
      {(title ?? lang) && (
        <figcaption className="flex items-baseline justify-between rounded-t-lg border border-b-0 border-line bg-raised px-4 py-1.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="flex items-center gap-3">
            {noteCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="font-sans text-[11px] text-ink-soft underline-offset-2 hover:text-accent hover:underline"
              >
                {showAll ? 'Hide line notes' : `Show line notes (${noteCount})`}
              </button>
            )}
            {py ? (
              <span className="flex items-center gap-1">
                <LangPill label="cpp" active={!showPy} onClick={() => setCodeLang('cpp')} />
                <LangPill label="py" active={showPy} onClick={() => setCodeLang('python')} />
              </span>
            ) : (
              <span className="font-mono text-[11px] text-ink-soft">{lang}</span>
            )}
          </span>
        </figcaption>
      )}
      <pre className={`overflow-x-auto border border-line bg-bg p-4 text-[13.5px] leading-relaxed ${title ?? lang ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <code>
          {Array.from({ length: lineCount }, (_, i) => {
            const n = i + 1
            const note = activeAnnotations[n]
            return (
              <Fragment key={i}>
                <span
                  className={`block ${note ? 'cursor-pointer bg-hinglish/60 hover:bg-hinglish' : ''}`}
                  onClick={() => note && setOpen(openLine === n ? null : { key, line: n })}
                >
                  {tokens
                    ? tokens[i]!.map((t, j) => (
                        <span key={j} style={{ color: t.color }}>
                          {t.content}
                        </span>
                      ))
                    : plainLines[i]}
                  {note && !showAll && (
                    <span className="ml-2 align-middle font-sans text-[11px] text-energy select-none">●</span>
                  )}
                  {'\n'}
                </span>
                {note && (showAll || openLine === n) && (
                  <span className="mb-1 block border-l-2 border-energy bg-hinglish py-1 pl-3 font-sans text-[13px] whitespace-normal text-ink">
                    {note}
                  </span>
                )}
              </Fragment>
            )
          })}
        </code>
      </pre>
    </figure>
  )
}

function LangPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${active ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
    >
      {label}
    </button>
  )
}
