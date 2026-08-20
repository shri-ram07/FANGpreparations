import { useState } from 'react'
import type { InterviewQ } from '@/content/types'
import { Md } from '@/lib/md'
import { useApp } from '@/stores/app'
import { interviewCardId } from '@/stores/slices/review'

export interface InterviewItem {
  moduleId: string
  index: number
  q: InterviewQ
  /** Shown as a small origin tag in pooled views (interview mode). */
  origin?: string
}

/** Reveal-style question list. Used by the module page (one module's questions)
 *  and by /interview (a pool across modules). */
export function InterviewList({ items }: { items: InterviewItem[] }) {
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const cards = useApp((s) => s.cards)
  const toggle = useApp((s) => s.toggleInterviewCard)

  return (
    <div className="space-y-3">
      {items.map(({ moduleId, index, q, origin }) => {
        const key = `${moduleId}:${index}`
        const inQueue = Boolean(cards[interviewCardId(moduleId, index)])
        return (
          <div key={key} className="max-w-[75ch] rounded-lg border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium">{q.question}</p>
              <span className="flex shrink-0 items-center gap-1.5">
                {origin && <span className="rounded-full bg-raised px-2 py-0.5 text-[11px] text-ink-soft">{origin}</span>}
                {q.isCaseBased && (
                  <span className="rounded-full border border-energy px-2 py-0.5 text-[11px] font-semibold text-energy">
                    case
                  </span>
                )}
              </span>
            </div>
            {revealed[key] ? (
              <div className="mt-2 border-t border-line pt-2 text-[15px]">
                <Md text={q.answer} />
                <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-ink-soft">
                  <input type="checkbox" checked={inQueue} onChange={() => toggle(moduleId, index)} />
                  I couldn't answer this — keep it in my review queue
                </label>
              </div>
            ) : (
              <button
                onClick={() => setRevealed({ ...revealed, [key]: true })}
                className="mt-2 text-sm font-medium text-accent hover:underline"
              >
                Reveal answer
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

export function InterviewBlock({ moduleId, questions }: { moduleId: string; questions: InterviewQ[] }) {
  return (
    <section className="my-8">
      <h2 className="text-xl font-bold">Interview questions</h2>
      <p className="mt-1 max-w-[70ch] text-sm text-ink-soft">
        Answer out loud first, then reveal. Be honest about the ones you couldn't answer — they join your review
        queue.
      </p>
      <div className="mt-3">
        <InterviewList items={questions.map((q, index) => ({ moduleId, index, q }))} />
      </div>
    </section>
  )
}
