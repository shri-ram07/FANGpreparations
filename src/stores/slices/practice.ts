import type { StateCreator } from 'zustand'
import type { AppState } from '../app'
import { localDay } from '@/lib/dates'
import { withToday } from './streak'

/** Mirrors the tracker spreadsheet's Status column. */
export type ProblemStatus = 'todo' | 'doing' | 'done' | 'revisit'

export interface PracticeSlice {
  /** problemId -> status + the local day it last changed. Problem text is
   *  NEVER stored — title/url/hint are looked up from data/neetcode150. */
  practice: Record<string, { status: ProblemStatus; day: string }>
  setProblemStatus: (id: string, status: ProblemStatus) => void
}

export const createPracticeSlice: StateCreator<AppState, [], [], PracticeSlice> = (set) => ({
  practice: {},

  setProblemStatus: (id, status) =>
    set((s) => {
      const practice = { ...s.practice }
      if (status === 'todo') delete practice[id] // back to untouched: don't keep a row
      else practice[id] = { status, day: localDay() }
      // Solving counts as study, same as completing a module.
      return status === 'done' ? { practice, activityDays: withToday(s.activityDays) } : { practice }
    }),
})
