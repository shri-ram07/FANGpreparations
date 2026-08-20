import type { StateCreator } from 'zustand'
import type { AppState } from '../app'
import { localDay } from '@/lib/dates'
import { spawnFlashcards } from './review'
import { withToday } from './streak'

export interface ProgressSlice {
  /** moduleId -> local day completed ('YYYY-MM-DD') */
  completed: Record<string, string>
  lastVisited: { subjectId: string; moduleId: string } | null
  setLastVisited: (subjectId: string, moduleId: string) => void
  completeModule: (subjectId: string, moduleId: string, flashcardCount: number) => void
}

export const createProgressSlice: StateCreator<AppState, [], [], ProgressSlice> = (set) => ({
  completed: {},
  lastVisited: null,

  setLastVisited: (subjectId, moduleId) => set({ lastVisited: { subjectId, moduleId } }),

  completeModule: (subjectId, moduleId, flashcardCount) =>
    set((s) => ({
      // idempotent: keep the original completion day on re-click
      completed: s.completed[moduleId] ? s.completed : { ...s.completed, [moduleId]: localDay() },
      lastVisited: { subjectId, moduleId },
      cards: spawnFlashcards(s.cards, moduleId, flashcardCount),
      activityDays: withToday(s.activityDays),
    })),
})
