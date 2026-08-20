import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createProgressSlice, type ProgressSlice } from './slices/progress'
import { createReviewSlice, type ReviewSlice } from './slices/review'
import { createSettingsSlice, type SettingsSlice } from './slices/settings'
import { createStreakSlice, type StreakSlice } from './slices/streak'
import { CURRENT_VERSION, STORAGE_KEY, migrations } from './migrations'

// ONE store, one persisted key: one export file, one version number, one
// migrate path. State must stay JSON-plain (no Map/Set/Date) and flat per
// slice — persist's rehydrate merge is shallow.
export type AppState = ProgressSlice & ReviewSlice & StreakSlice & SettingsSlice

export const useApp = create<AppState>()(
  persist(
    (...a) => ({
      ...createProgressSlice(...a),
      ...createReviewSlice(...a),
      ...createStreakSlice(...a),
      ...createSettingsSlice(...a),
    }),
    {
      name: STORAGE_KEY,
      version: CURRENT_VERSION,
      migrate: (state, from) => migrations.slice(from).reduce((s, m) => m(s), state as unknown) as AppState,
    },
  ),
)
