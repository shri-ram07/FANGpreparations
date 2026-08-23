import { localDay } from '@/lib/dates'

export const STORAGE_KEY = 'faang-prep'

// Append-only. Any change to the persisted shape = push a migration fn here;
// the store version bumps itself (CURRENT_VERSION = migrations.length) and
// zustand persist runs the pending slice of migrations once on rehydrate.
export const migrations: Array<(state: unknown) => unknown> = [
  // v0 -> v1: Revision mode's weekly recall test (MASTER_STUDY_PLAN §7).
  // Older saves have no lastRecallDay; null means "never done", which is what
  // the dashboard nudge treats as due.
  (state) => ({ ...(state as object), lastRecallDay: null }),

  // v1 -> v2: the NeetCode 150 practice tracker. Older saves have no practice
  // map; {} means "nothing attempted", which is what the page renders by default.
  (state) => ({ ...(state as object), practice: {} }),

  // v2 -> v3: highlights and margin notes. Older saves have no annotations map;
  // {} means "nothing highlighted", which is what a module renders by default.
  (state) => ({ ...(state as object), annotations: {} }),
]

export const CURRENT_VERSION = migrations.length

// The persisted blob already contains { state, version }, so the export file
// IS the storage value. Importing an old export triggers the same migration
// path on rehydrate — progress is never wiped by schema changes.
export function downloadProgress() {
  const blob = new Blob([localStorage.getItem(STORAGE_KEY) ?? '{}'], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `faang-prep-backup-${localDay()}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function importProgress(text: string): void {
  const parsed: unknown = JSON.parse(text) // throws on invalid JSON — caller shows the error
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as { version?: unknown }).version !== 'number' ||
    typeof (parsed as { state?: unknown }).state !== 'object'
  ) {
    throw new Error('Not a faang-prep backup file')
  }
  localStorage.setItem(STORAGE_KEY, text)
  location.reload()
}
