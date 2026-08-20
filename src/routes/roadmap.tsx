import { Link } from 'react-router'
import { DAILY_RHYTHM, PHASES, WEEKEND_RHYTHM } from '@/content/roadmap'
import { subjectById } from '@/content/registry'
import { useApp } from '@/stores/app'

export function Component() {
  const completed = useApp((s) => s.completed)

  const progressOf = (subjectIds: (typeof PHASES)[number]['subjects']) => {
    let done = 0
    let total = 0
    for (const id of subjectIds) {
      const s = subjectById[id]
      total += s.modules.length
      done += s.modules.filter((m) => completed[m.id]).length
    }
    return total === 0 ? 0 : Math.round((done / total) * 100)
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-bold">Roadmap</h1>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        ~12 months, three parallel tracks: problem solving (daily, forever), AI core, engineering. Compress or
        stretch — the order is the contract, not the calendar.
      </p>

      <div className="mt-8 space-y-0">
        {PHASES.map((p, i) => {
          const pct = progressOf(p.subjects)
          return (
            <div key={p.n} className="relative flex gap-5 pb-8">
              {i < PHASES.length - 1 && <span className="absolute top-9 left-[17px] h-full w-px bg-line" />}
              <span
                className={`z-10 grid size-9 shrink-0 place-items-center rounded-full border font-mono text-sm font-bold ${
                  pct === 100 ? 'border-correct bg-correct text-white' : pct > 0 ? 'border-energy bg-bg text-ink' : 'border-line bg-bg text-ink-soft'
                }`}
              >
                {p.n}
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="text-lg font-bold">Phase {p.n}</h2>
                  <span className="font-mono text-xs text-ink-soft">months {p.months}</span>
                  {p.subjects.length > 0 && <span className="font-mono text-xs text-ink-soft">{pct}%</span>}
                </div>
                <p className="mt-0.5">{p.focus}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Outcome: <span className="text-ink">{p.outcome}</span>
                </p>
                {p.subjects.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {p.subjects.map((id) => (
                      <Link
                        key={id}
                        to={`/subject/${id}`}
                        className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-accent hover:text-accent"
                      >
                        {subjectById[id].title}
                      </Link>
                    ))}
                  </div>
                )}
                {p.subjects.length > 0 && (
                  <div className="mt-2 h-1.5 max-w-xs overflow-hidden rounded-full bg-raised">
                    <span className="block h-full rounded-full bg-energy" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-raised p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Daily rhythm (weekdays)</h2>
          <ul className="mt-2 space-y-1 text-[15px]">
            {DAILY_RHYTHM.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-line bg-raised p-5">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Weekend rhythm</h2>
          <ul className="mt-2 space-y-1 text-[15px]">
            {WEEKEND_RHYTHM.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
