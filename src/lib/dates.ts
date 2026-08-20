// All day math in this app uses LOCAL calendar days ('YYYY-MM-DD').
// Never use toISOString() for dates: it converts to UTC, and in IST (+5:30)
// anything before 05:30 local counts as yesterday — silent streak breaks
// and early-due review cards.

export const localDay = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const addDays = (n: number, from: Date = new Date()): string => {
  const d = new Date(from)
  d.setDate(d.getDate() + n)
  return localDay(d)
}

// Today without activity does NOT break the streak — the day isn't over yet.
export function computeStreak(activityDays: string[]): number {
  const set = new Set(activityDays)
  const d = new Date()
  if (!set.has(localDay(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(localDay(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}
