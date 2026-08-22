import { Suspense, useState } from 'react'
import { NavLink, Outlet } from 'react-router'
import { SUBJECTS } from '@/content/registry'
import { useApp } from '@/stores/app'
import { localDay } from '@/lib/dates'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-1.5 text-sm transition-colors ${
    isActive ? 'bg-raised font-medium text-accent' : 'text-ink-soft hover:text-ink'
  }`

export function AppShell() {
  const [open, setOpen] = useState(true)
  const today = localDay()
  const dueCount = useApp((s) => Object.values(s.cards).filter((c) => c.due <= today).length)

  return (
    <div className="flex min-h-screen">
      {open && (
        <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line">
          <div className="flex items-center justify-between px-4 py-4">
            <NavLink to="/" className="font-display text-lg font-bold tracking-tight">
              FAANG Prep
            </NavLink>
            <button
              onClick={() => setOpen(false)}
              aria-label="Collapse sidebar"
              className="rounded px-1.5 text-ink-soft hover:bg-raised hover:text-ink"
            >
              ⟨
            </button>
          </div>

          <nav className="flex flex-col gap-0.5 px-2">
            <NavLink to="/" end className={navLink}>
              Dashboard
            </NavLink>
            <NavLink to="/subjects" className={navLink}>
              Subject map
            </NavLink>
            <NavLink to="/roadmap" className={navLink}>
              Roadmap
            </NavLink>
            <NavLink to="/practice" className={navLink}>
              NeetCode 150
            </NavLink>
            <NavLink to="/review" className={navLink}>
              <span className="flex items-center justify-between">
                Review
                {dueCount > 0 && (
                  <span className="rounded-full bg-energy px-1.5 text-xs font-semibold text-white">{dueCount}</span>
                )}
              </span>
            </NavLink>
            <NavLink to="/interview" className={navLink}>
              Interview mode
            </NavLink>
            <NavLink to="/revision" className={navLink}>
              Revision mode
            </NavLink>
            <NavLink to="/playground/sql" className={navLink}>
              SQL playground
            </NavLink>
          </nav>

          <div className="mt-5 mb-1 px-5 text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Subjects</div>
          <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-4">
            {SUBJECTS.map((s) => (
              <NavLink key={s.id} to={`/subject/${s.id}`} className={navLink}>
                <span className="flex items-baseline gap-2">
                  <span className="w-8 shrink-0 font-mono text-[11px] text-ink-soft">{s.short}</span>
                  {s.title}
                </span>
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand sidebar"
          className="fixed top-4 left-4 z-10 rounded-md border border-line bg-bg px-2 py-1 text-ink-soft hover:text-ink"
        >
          ⟩
        </button>
      )}

      <main className="min-w-0 flex-1">
        <Suspense
          fallback={
            <div className="mx-auto max-w-3xl px-8 py-16">
              <div className="h-7 w-52 animate-pulse rounded bg-raised" />
              <div className="mt-6 h-40 animate-pulse rounded-lg bg-raised" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
