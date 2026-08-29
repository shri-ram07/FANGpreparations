import type { StateCreator } from 'zustand'
import type { AppState } from '../app'

export interface SettingsSlice {
  hinglishOn: boolean
  /** Which language every code block shows when it has both variants. */
  codeLang: 'cpp' | 'python'
  dailyGoalMinutes: number
  /** Local day of the last completed recall test; null = never. Drives the weekly nudge. */
  lastRecallDay: string | null
  setHinglish: (on: boolean) => void
  setCodeLang: (lang: 'cpp' | 'python') => void
  setDailyGoal: (minutes: number) => void
  markRecallDone: (day: string) => void
}

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set) => ({
  hinglishOn: true,
  codeLang: 'cpp',
  dailyGoalMinutes: 60,
  lastRecallDay: null,
  setHinglish: (on) => set({ hinglishOn: on }),
  setCodeLang: (lang) => set({ codeLang: lang }),
  setDailyGoal: (minutes) => set({ dailyGoalMinutes: minutes }),
  markRecallDone: (day) => set({ lastRecallDay: day }),
})
