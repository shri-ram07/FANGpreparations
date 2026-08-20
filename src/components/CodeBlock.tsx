import { Fragment, useEffect, useState } from 'react'
import type { ThemedToken } from 'shiki/core'
import { getHighlighter } from '@/lib/highlighter'
import type { CodeLang } from '@/content/types'

interface Props {
  code: string
  lang: CodeLang
  title?: string
  /** 1-based line number -> note. Annotated lines get a marker; click toggles the note inline. */
  annotations?: Record<number, string>
}

// The un-highlighted <pre> is both the loading state and the error fallback —
// identical font metrics, so highlighting fades in with zero layout shift.
export function CodeBlock({ code, lang, title, annotations = {} }: Props) {
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null)
  const [open, setOpen] = useState<number | null>(null)

  useEffect(() => {
    let live = true
    getHighlighter()
      .then((hl) => {
        if (live) setTokens(hl.codeToTokens(code, { lang, theme: 'github-light' }).tokens)
      })
      .catch(() => {}) // plain <pre> stays — never blank the code
    return () => {
      live = false
    }
  }, [code, lang])

  const plainLines = code.split('\n')
  const lineCount = tokens ? tokens.length : plainLines.length

  return (
    <figure className="my-4">
      {(title ?? lang) && (
        <figcaption className="flex items-baseline justify-between rounded-t-lg border border-b-0 border-line bg-raised px-4 py-1.5">
          <span className="text-sm font-medium">{title}</span>
          <span className="font-mono text-[11px] text-ink-soft">{lang}</span>
        </figcaption>
      )}
      <pre className={`overflow-x-auto border border-line bg-bg p-4 text-[13.5px] leading-relaxed ${title ?? lang ? 'rounded-b-lg' : 'rounded-lg'}`}>
        <code>
          {Array.from({ length: lineCount }, (_, i) => {
            const n = i + 1
            const note = annotations[n]
            return (
              <Fragment key={i}>
                <span
                  className={`block ${note ? 'cursor-pointer bg-hinglish/60 hover:bg-hinglish' : ''}`}
                  onClick={() => note && setOpen(open === n ? null : n)}
                >
                  {tokens
                    ? tokens[i]!.map((t, j) => (
                        <span key={j} style={{ color: t.color }}>
                          {t.content}
                        </span>
                      ))
                    : plainLines[i]}
                  {note && <span className="ml-2 align-middle font-sans text-[11px] text-energy select-none">●</span>}
                  {'\n'}
                </span>
                {note && open === n && (
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
