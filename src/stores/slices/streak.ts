import type { StateCreator } from 'zustand'
import type { AppState } from '../app'
import { localDay } from '@/lib/dates'

export interface StreakSlice {
  /** Sorted, deduped local days ('YYYY-MM-DD') with any study activity. Streak is DERIVED via computeStreak, never stored. */
  activityDays: string[]
  touchToday: () => void
}

/** Pure helper shared by other slices' actions (complete, grade). */
export function withToday(days: string[]): string[] {
  const t = localDay()
  return days.includes(t) ? days : [...days, t].sort()
}

export const createStreakSlice: StateCreator<AppState, [], [], StreakSlice> = (set) => ({
  activityDays: [],
  touchToday: () => set((s) => ({ activityDays: withToday(s.activityDays) })),
})
