import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { findModule, loadModule } from '@/content/registry'
import type { SubjectId } from '@/content/types'
import { useApp } from '@/stores/app'
import { InterviewList, type InterviewItem } from '@/components/InterviewBlock'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

export function Component() {
  const completed = useApp((s) => s.completed)
  const completedModules = useMemo(
    () =>
      Object.keys(completed)
        .map(findModule)
        .filter((f): f is NonNullable<ReturnType<typeof findModule>> => f !== null),
    [completed],
  )
  const subjects = useMemo(() => {
    const seen = new Map<SubjectId, string>()
    for (const f of completedModules) seen.set(f.subject.id, f.subject.title)
    return [...seen.entries()]
  }, [completedModules])

  const [filter, setFilter] = useState<SubjectId | 'all'>('all')
  const [items, setItems] = useState<InterviewItem[] | null>(null)
  const [poolSize, setPoolSize] = useState(0)
  const [drawing, setDrawing] = useState(false)

  const draw = async () => {
    setDrawing(true)
    const entries = completedModules.filter((f) => filter === 'all' || f.subject.id === filter)
    const modules = await Promise.all(entries.map((f) => loadModule(f.entry)))
    const pool: InterviewItem[] = modules.flatMap((m) =>
      m.interviewQuestions.map((q, index) => ({ moduleId: m.id, index, q, origin: m.title })),
    )
    setPoolSize(pool.length)
    setItems(shuffle(pool).slice(0, 20))
    setDrawing(false)
  }

  if (completedModules.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-3xl font-bold">Interview mode</h1>
        <div className="mt-6 rounded-lg border border-line bg-raised p-6">
          <p className="font-medium">No completed modules yet.</p>
          <p className="mt-1 text-ink-soft">
            Interview mode pulls a random 20 questions from modules you have finished — complete one first.
          </p>
          <Link to="/" className="mt-2 inline-block text-accent hover:underline">
            Back to today's plan →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-bold">Interview mode</h1>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        Random 20 from everything you've completed. Out loud, full sentences, like the real room. Mark the misses
        honestly — they feed your review queue.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full border px-3 py-1 text-sm ${filter === 'all' ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
        >
          All subjects
        </button>
        {subjects.map(([id, title]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`rounded-full border px-3 py-1 text-sm ${filter === id ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
          >
            {title}
          </button>
        ))}
        <button
          onClick={() => void draw()}
          disabled={drawing}
          className="ml-auto rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {drawing ? 'Drawing…' : items ? 'Redraw 20' : 'Draw 20'}
        </button>
      </div>

      {items && (
        <>
          <p className="mt-4 text-sm text-ink-soft">
            {items.length} of {poolSize} in the pool · case questions carry the amber badge
          </p>
          <div className="mt-3">
            <InterviewList items={items} />
          </div>
        </>
      )}
    </div>
  )
}
