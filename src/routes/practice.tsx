import { useMemo, useState } from 'react'
import { CATEGORIES, PROBLEMS, type Difficulty, type Problem } from '@/data/neetcode150'
import { useApp } from '@/stores/app'
import type { ProblemStatus } from '@/stores/slices/practice'

const DIFFS: Difficulty[] = ['Easy', 'Medium', 'Hard']

const diffClass: Record<Difficulty, string> = {
  Easy: 'text-correct border-correct/40 bg-correct/5',
  Medium: 'text-energy border-energy/40 bg-energy/5',
  Hard: 'text-wrong border-wrong/40 bg-wrong/5',
}

// Click cycles forward through the same states the spreadsheet's dropdown had.
const NEXT: Record<ProblemStatus, ProblemStatus> = {
  todo: 'doing',
  doing: 'done',
  done: 'revisit',
  revisit: 'todo',
}

const statusLabel: Record<ProblemStatus, string> = {
  todo: 'Not started',
  doing: 'In progress',
  done: 'Done',
  revisit: 'Revisit',
}

const statusClass: Record<ProblemStatus, string> = {
  todo: 'border-line text-ink-soft hover:border-accent hover:text-accent',
  doing: 'border-accent bg-accent/10 text-accent',
  done: 'border-correct bg-correct text-white',
  revisit: 'border-energy bg-energy/15 text-energy',
}

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <span
          className={`block h-full rounded-full ${pct === 100 ? 'bg-correct' : 'bg-accent'}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-mono text-xs text-ink-soft">
        {done}/{total}
      </span>
    </span>
  )
}

export function Component() {
  const practice = useApp((s) => s.practice)
  const setProblemStatus = useApp((s) => s.setProblemStatus)

  const [category, setCategory] = useState<string>('All')
  const [difficulty, setDifficulty] = useState<string>('All')
  const [hideDone, setHideDone] = useState(false)
  const [query, setQuery] = useState('')
  const [openHint, setOpenHint] = useState<string | null>(null)

  const statusOf = (id: string): ProblemStatus => practice[id]?.status ?? 'todo'

  const doneCount = PROBLEMS.filter((p) => statusOf(p.id) === 'done').length

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PROBLEMS.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (difficulty !== 'All' && p.difficulty !== difficulty) return false
      if (hideDone && (practice[p.id]?.status ?? 'todo') === 'done') return false
      if (q && !p.title.toLowerCase().includes(q) && !p.category.toLowerCase().includes(q)) return false
      return true
    })
  }, [category, difficulty, hideDone, query, practice])

  // Group the filtered list back into roadmap order.
  const groups = useMemo(() => {
    const by = new Map<string, Problem[]>()
    for (const p of visible) {
      const list = by.get(p.category)
      if (list) list.push(p)
      else by.set(p.category, [p])
    }
    return CATEGORIES.filter((c) => by.has(c)).map((c) => [c, by.get(c)!] as const)
  }, [visible])

  const select =
    'rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-accent focus:outline-none'

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-bold">NeetCode 150</h1>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        The whole list in roadmap order. Work top to bottom — each category builds on the one before it. Click a
        title to open it on LeetCode, click the status button to cycle Not started → In progress → Done → Revisit.
        Marking one Done counts toward your streak.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-line bg-raised px-5 py-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">Overall</div>
          <div className="mt-1">
            <Bar done={doneCount} total={PROBLEMS.length} />
          </div>
        </div>
        {DIFFS.map((d) => {
          const all = PROBLEMS.filter((p) => p.difficulty === d)
          return (
            <div key={d}>
              <div className="text-[11px] font-semibold tracking-wide text-ink-soft uppercase">{d}</div>
              <div className="mt-1">
                <Bar done={all.filter((p) => statusOf(p.id) === 'done').length} total={all.length} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems…"
          aria-label="Search problems"
          className={`${select} min-w-52 flex-1`}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filter by category" className={select}>
          <option value="All">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} aria-label="Filter by difficulty" className={select}>
          <option value="All">All difficulties</option>
          {DIFFS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} className="accent-accent" />
          Hide done
        </label>
      </div>

      {groups.length === 0 && <p className="mt-10 text-ink-soft">No problems match those filters.</p>}

      {groups.map(([cat, list]) => {
        const all = PROBLEMS.filter((p) => p.category === cat)
        return (
          <section key={cat} className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <h2 className="font-display text-lg font-semibold">{cat}</h2>
              <Bar done={all.filter((p) => statusOf(p.id) === 'done').length} total={all.length} />
            </div>

            <ul>
              {list.map((p) => {
                const st = statusOf(p.id)
                return (
                  <li key={p.id} className={`border-b border-line ${st === 'done' ? 'bg-correct/5' : ''}`}>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                      <span className="w-7 shrink-0 text-right font-mono text-xs text-ink-soft">{p.n}</span>

                      <button
                        onClick={() => setProblemStatus(p.id, NEXT[st])}
                        title={`${statusLabel[st]} — click for ${statusLabel[NEXT[st]]}`}
                        className={`w-24 shrink-0 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${statusClass[st]}`}
                      >
                        {statusLabel[st]}
                      </button>

                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className={`min-w-40 flex-1 text-sm hover:text-accent hover:underline ${
                          st === 'done' ? 'text-ink-soft' : 'text-ink'
                        }`}
                      >
                        {p.title}
                      </a>

                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[11px] font-medium ${diffClass[p.difficulty]}`}>
                        {p.difficulty}
                      </span>

                      <span className="hidden shrink-0 font-mono text-[11px] text-ink-soft sm:inline">
                        {p.time} · {p.space}
                      </span>

                      <button
                        onClick={() => setOpenHint(openHint === p.id ? null : p.id)}
                        className="shrink-0 text-xs text-ink-soft hover:text-accent"
                        aria-expanded={openHint === p.id}
                      >
                        {openHint === p.id ? 'Hide hint' : 'Hint'}
                      </button>
                    </div>

                    {openHint === p.id && (
                      <p className="max-w-[70ch] pb-3 pl-10 text-[13px] text-ink-soft">{p.hint}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
