import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { SUBJECTS, findModule, loadModule } from '@/content/registry'
import type { Module } from '@/content/types'
import { useApp } from '@/stores/app'
import { addDays, localDay } from '@/lib/dates'
import type { ReviewCard } from '@/stores/slices/review'

interface QueueItem {
  card: ReviewCard
  subjectTitle: string
}

export function Component() {
  const removeCard = useApp((s) => s.removeCard)
  const gradeCard = useApp((s) => s.gradeCard)

  // Snapshot the queue ONCE on mount: grading changes due dates, and a live
  // list would reshuffle under the user mid-session.
  const [queue] = useState<QueueItem[]>(() => {
    const { cards } = useApp.getState()
    const today = localDay()
    const order = new Map(SUBJECTS.map((s, i) => [s.id, i]))
    const items: QueueItem[] = []
    for (const card of Object.values(cards)) {
      if (card.due > today) continue
      const found = findModule(card.moduleId)
      if (!found) {
        removeCard(card.id) // orphan: module was removed from content
        continue
      }
      items.push({ card, subjectTitle: found.subject.title })
    }
    items.sort((a, b) => {
      const sa = order.get(findModule(a.card.moduleId)!.subject.id) ?? 99
      const sb = order.get(findModule(b.card.moduleId)!.subject.id) ?? 99
      return sa - sb || a.card.moduleId.localeCompare(b.card.moduleId) || a.card.kind.localeCompare(b.card.kind) || a.card.index - b.card.index
    })
    return items
  })

  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [modules, setModules] = useState<Record<string, Module>>({})
  const [loading, setLoading] = useState(queue.length > 0)

  const distinctModuleIds = useMemo(() => [...new Set(queue.map((i) => i.card.moduleId))], [queue])

  useEffect(() => {
    let live = true
    if (distinctModuleIds.length === 0) return
    void Promise.all(
      distinctModuleIds.map(async (id) => {
        const found = findModule(id)
        return found ? ([id, await loadModule(found.entry)] as const) : null
      }),
    ).then((pairs) => {
      if (!live) return
      setModules(Object.fromEntries(pairs.filter((p): p is NonNullable<typeof p> => p !== null)))
      setLoading(false)
    })
    return () => {
      live = false
    }
  }, [distinctModuleIds])

  // Upcoming summary (computed live — cheap)
  const cards = useApp((s) => s.cards)
  const dueTomorrow = Object.values(cards).filter((c) => c.due === addDays(1)).length

  const item = queue[idx]
  const module = item ? modules[item.card.moduleId] : undefined
  const flash = item && item.card.kind === 'flash' ? module?.flashcards[item.card.index] : undefined
  const iq = item && item.card.kind === 'interview' ? module?.interviewQuestions[item.card.index] : undefined
  const front = flash?.front ?? iq?.question
  const back = flash?.back ?? iq?.answer

  // Content was edited and this index no longer exists → drop the card, move on.
  const staleCardId = item && module && front === undefined ? item.card.id : null
  useEffect(() => {
    if (staleCardId) {
      removeCard(staleCardId)
      setIdx((i) => i + 1)
    }
  }, [staleCardId, removeCard])

  // Keyboard: space flips, 1 = again, 2 = good.
  const cardId = item?.card.id
  useEffect(() => {
    if (!cardId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === ' ') {
        e.preventDefault()
        setFlipped(true)
      } else if (flipped && (e.key === '1' || e.key === '2')) {
        gradeCard(cardId, e.key === '1' ? 'again' : 'good')
        setFlipped(false)
        setIdx((i) => i + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [cardId, flipped, gradeCard])

  if (queue.length === 0 || !item) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="text-3xl font-bold">Review</h1>
        {idx > 0 ? (
          <div className="mt-6 rounded-lg border border-line bg-raised p-6">
            <p className="text-lg font-medium text-correct">Queue clear — {idx} cards reviewed.</p>
            <p className="mt-1 text-ink-soft">
              {dueTomorrow > 0 ? `${dueTomorrow} due tomorrow. ` : ''}The intervals do the remembering for you.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-lg border border-line bg-raised p-6">
            <p className="text-lg font-medium">Nothing due today.</p>
            <p className="mt-1 text-ink-soft">
              {dueTomorrow > 0
                ? `${dueTomorrow} card${dueTomorrow === 1 ? '' : 's'} arrive tomorrow.`
                : 'Complete a module and its flashcards will start cycling here: 1 → 3 → 7 → 21 → 60 days.'}
            </p>
            <Link to="/" className="mt-2 inline-block text-accent hover:underline">
              Back to today's plan →
            </Link>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <h1 className="text-3xl font-bold">Review</h1>
        <div className="mt-6 h-56 animate-pulse rounded-lg bg-raised" />
      </div>
    )
  }

  const { card } = item
  if (staleCardId) return null

  const grade = (g: 'again' | 'good') => {
    gradeCard(card.id, g)
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <header className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">Review</h1>
        <span className="font-mono text-sm text-ink-soft">
          {idx + 1}/{queue.length}
        </span>
      </header>
      <p className="mt-1 text-sm text-ink-soft">
        {item.subjectTitle} · {module?.title ?? card.moduleId} ·{' '}
        {card.kind === 'interview' ? 'interview question you missed' : 'flashcard'} · step {card.step} of the
        1/3/7/21/60 ladder
      </p>

      <div className="mt-6 rounded-xl border border-line p-6">
        <p className="text-lg font-medium">{front}</p>
        {flipped ? (
          <>
            <div className="mt-4 border-t border-line pt-4 text-[15px]">
              <p className="whitespace-pre-line">{back}</p>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => grade('again')}
                className="rounded-lg border border-wrong px-4 py-2 font-medium text-wrong hover:bg-wrong hover:text-white"
              >
                Again — see it tomorrow
              </button>
              <button
                onClick={() => grade('good')}
                className="rounded-lg border border-correct px-4 py-2 font-medium text-correct hover:bg-correct hover:text-white"
              >
                Good
              </button>
              {card.kind === 'interview' && card.step >= 3 && (
                <button
                  onClick={() => {
                    removeCard(card.id)
                    setFlipped(false)
                    setIdx((i) => i + 1)
                  }}
                  className="ml-auto text-sm text-ink-soft hover:text-ink"
                >
                  Got it — retire this card
                </button>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="mt-5 rounded-lg bg-accent px-4 py-2 font-medium text-white hover:bg-accent/90"
          >
            Show answer
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-ink-soft">
        Answer out loud BEFORE flipping — recall is the workout; rereading is just stretching. Keys: space = flip,
        1 = again, 2 = good.
      </p>
    </div>
  )
}
