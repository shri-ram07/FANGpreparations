import type { StateCreator } from 'zustand'
import type { AppState } from '../app'
import { addDays, localDay } from '@/lib/dates'
import { withToday } from './streak'

/** SM-2 lite: fixed interval ladder, days at step 0..4. */
export const LADDER = [1, 3, 7, 21, 60] as const
export type Step = 0 | 1 | 2 | 3 | 4

export interface ReviewCard {
  /** Deterministic: `${moduleId}:fc:${i}` | `${moduleId}:iq:${i}` — makes spawning idempotent (StrictMode/double-click safe). */
  id: string
  moduleId: string
  kind: 'flash' | 'interview'
  /** Index into module.flashcards / module.interviewQuestions — card content is NEVER stored, always looked up. */
  index: number
  step: Step
  due: string // local 'YYYY-MM-DD'; due when `due <= localDay()` (string compare is correct for zero-padded ISO)
  addedOn: string
}

export interface ReviewSlice {
  cards: Record<string, ReviewCard>
  gradeCard: (id: string, grade: 'again' | 'good') => void
  toggleInterviewCard: (moduleId: string, qIndex: number) => void
  removeCard: (id: string) => void
}

export const flashcardId = (moduleId: string, i: number) => `${moduleId}:fc:${i}`
export const interviewCardId = (moduleId: string, i: number) => `${moduleId}:iq:${i}`

/** Pure; used by progress.completeModule. Skips ids that already exist. */
export function spawnFlashcards(
  cards: Record<string, ReviewCard>,
  moduleId: string,
  count: number,
): Record<string, ReviewCard> {
  const next = { ...cards }
  for (let i = 0; i < count; i++) {
    const id = flashcardId(moduleId, i)
    next[id] ??= { id, moduleId, kind: 'flash', index: i, step: 0, due: addDays(1), addedOn: localDay() }
  }
  return next
}

export const createReviewSlice: StateCreator<AppState, [], [], ReviewSlice> = (set) => ({
  cards: {},

  gradeCard: (id, grade) =>
    set((s) => {
      const c = s.cards[id]
      if (!c) return {}
      const step = (grade === 'good' ? Math.min(c.step + 1, 4) : Math.max(c.step - 1, 0)) as Step
      // 'again' is due TOMORROW, not LADDER[step] — failing a 21-day card and
      // hiding it for 7 days would defeat the point. It re-climbs from the new step.
      const due = grade === 'good' ? addDays(LADDER[step]) : addDays(1)
      return {
        cards: { ...s.cards, [id]: { ...c, step, due } },
        activityDays: withToday(s.activityDays),
      }
    }),

  toggleInterviewCard: (moduleId, qIndex) =>
    set((s) => {
      const id = interviewCardId(moduleId, qIndex)
      const cards = { ...s.cards }
      if (cards[id]) {
        delete cards[id]
      } else {
        cards[id] = { id, moduleId, kind: 'interview', index: qIndex, step: 0, due: addDays(1), addedOn: localDay() }
      }
      return { cards }
    }),

  removeCard: (id) =>
    set((s) => {
      const cards = { ...s.cards }
      delete cards[id]
      return { cards }
    }),
})
