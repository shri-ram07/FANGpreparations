import { useRef } from 'react'
import { Link } from 'react-router'
import { SUBJECTS, findModuleEntry } from '@/content/registry'
import { useApp } from '@/stores/app'
import { addDays, computeStreak, localDay } from '@/lib/dates'
import { downloadProgress, importProgress } from '@/stores/migrations'

export default function Dashboard() {
  const today = localDay()
  const completed = useApp((s) => s.completed)
  const lastVisited = useApp((s) => s.lastVisited)
  const activityDays = useApp((s) => s.activityDays)
  const hinglishOn = useApp((s) => s.hinglishOn)
  const setHinglish = useApp((s) => s.setHinglish)
  const dueCount = useApp((s) => Object.values(s.cards).filter((c) => c.due <= today).length)

  const lastRecallDay = useApp((s) => s.lastRecallDay)

  const streak = computeStreak(activityDays)
  // Weekly cadence (MASTER_STUDY_PLAN §7). Needs something learned to test on;
  // null lastRecallDay = never taken = due.
  const recallDue =
    Object.keys(completed).length > 0 && (lastRecallDay === null || lastRecallDay <= addDays(-7))
  const continueTarget = lastVisited ? findModuleEntry(lastVisited.subjectId, lastVisited.moduleId) : null
  const fileRef = useRef<HTMLInputElement>(null)

  const dateLabel = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">{dateLabel}</p>
          <h1 className="text-3xl font-bold">Today's work</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm">
            <span className="size-2 rounded-full bg-energy" />
            {streak}-day streak
          </span>
          <Link
            to="/review"
            className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent"
          >
            {dueCount} due for review
          </Link>
        </div>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-raised p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Continue</h2>
          {continueTarget ? (
            <Link
              to={`/subject/${continueTarget.subject.id}/${continueTarget.entry.id}`}
              className="mt-2 block font-display text-lg font-medium text-accent hover:underline"
            >
              {continueTarget.entry.title} →
            </Link>
          ) : (
            <>
              <p className="mt-2 text-ink-soft">Nothing in progress yet.</p>
              <Link to="/subject/python" className="mt-1 block font-medium text-accent hover:underline">
                Start with Python + OOP →
              </Link>
            </>
          )}
        </div>

        <div className="rounded-lg border border-line bg-raised p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Today's plan</h2>
          <ul className="mt-2 space-y-1 text-[15px]">
            <li>
              <Link to="/subject/dsa" className="hover:text-accent">
                1 new DSA problem + 1 revision — the daily habit
              </Link>
            </li>
            <li>
              {continueTarget ? (
                <Link
                  to={`/subject/${continueTarget.subject.id}/${continueTarget.entry.id}`}
                  className="hover:text-accent"
                >
                  Current phase: {continueTarget.entry.title}
                </Link>
              ) : (
                <Link to="/subject/python" className="hover:text-accent">
                  Current phase: Python + OOP, Level 0
                </Link>
              )}
            </li>
            <li>
              <Link to="/review" className="hover:text-accent">
                Clear the review queue ({dueCount} due)
              </Link>
            </li>
            {recallDue && (
              <li>
                <Link to="/revision" className="hover:text-accent">
                  Weekly recall test — rebuild a mind map from a blank page
                </Link>
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Subjects</h2>
        <div className="mt-4 space-y-2">
          {SUBJECTS.map((s) => {
            const total = s.modules.length
            const done = s.modules.filter((m) => completed[m.id]).length
            const pct = total === 0 ? 0 : Math.round((done / total) * 100)
            return (
              <Link
                key={s.id}
                to={`/subject/${s.id}`}
                className="flex items-center gap-4 rounded-md border border-line px-4 py-2.5 hover:border-accent"
              >
                <span className="w-10 shrink-0 font-mono text-xs text-ink-soft">{s.short}</span>
                <span className="w-44 shrink-0 text-sm font-medium">{s.title}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-raised">
                  <span className="block h-full rounded-full bg-energy" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-16 shrink-0 text-right text-xs text-ink-soft">
                  {total === 0 ? 'soon' : `${done}/${total}`}
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="mt-10 flex flex-wrap items-center gap-3 border-t border-line pt-6 text-sm">
        <span className="text-ink-soft">Data:</span>
        <button onClick={downloadProgress} className="rounded-md border border-line px-3 py-1 hover:border-accent hover:text-accent">
          Export progress
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-md border border-line px-3 py-1 hover:border-accent hover:text-accent"
        >
          Import progress
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              importProgress(await file.text())
            } catch (err) {
              alert(err instanceof Error ? err.message : 'Import failed')
            }
            e.target.value = ''
          }}
        />
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-ink-soft">
          <input type="checkbox" checked={hinglishOn} onChange={(e) => setHinglish(e.target.checked)} />
          Hinglish boxes
        </label>
      </section>
    </div>
  )
}
