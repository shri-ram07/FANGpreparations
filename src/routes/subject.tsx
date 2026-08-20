import { Suspense, lazy } from 'react'
import { Link, useParams } from 'react-router'
import { subjectById } from '@/content/registry'
import type { Level, SubjectDef, SubjectId } from '@/content/types'
import { useApp } from '@/stores/app'

const MindMap = lazy(() => import('@/components/MindMap'))

export function Component() {
  const { subjectId } = useParams()
  const subject: SubjectDef | undefined = subjectById[subjectId as SubjectId]
  const completed = useApp((s) => s.completed)

  if (!subject) {
    return (
      <div className="mx-auto max-w-4xl px-8 py-10">
        <h1 className="text-3xl font-bold">Unknown subject</h1>
        <Link to="/" className="text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const done = subject.modules.filter((m) => completed[m.id]).length

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-bold">{subject.title}</h1>
      <p className="mt-2 max-w-[70ch] text-ink-soft">{subject.why}</p>
      {subject.prereqs.length > 0 && (
        <p className="mt-2 text-sm text-ink-soft">
          Builds on:{' '}
          {subject.prereqs.map((p, i) => (
            <span key={p}>
              {i > 0 && ', '}
              <Link to={`/subject/${p}`} className="text-accent hover:underline">
                {subjectById[p].title}
              </Link>
            </span>
          ))}
        </p>
      )}
      {subject.modules.length > 0 && (
        <p className="mt-3 text-sm">
          {done}/{subject.modules.length} modules complete
        </p>
      )}

      {/* Level ladder */}
      <div className="mt-8 space-y-8">
        {([0, 1, 2, 3] as Level[]).map((level) => {
          const title = subject.levelTitles[level]
          const mods = subject.modules.filter((m) => m.level === level)
          if (!title && mods.length === 0) return null
          return (
            <section key={level}>
              <h2 className="flex items-baseline gap-3 text-lg font-bold">
                <span className="rounded-md border border-line px-2 py-0.5 font-mono text-xs text-ink-soft">
                  L{level}
                </span>
                {title}
              </h2>
              {mods.length === 0 ? (
                <p className="mt-2 text-sm text-ink-soft">Modules on the way.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {mods.map((m) => {
                    const isDone = Boolean(completed[m.id])
                    return (
                      <Link
                        key={m.id}
                        to={`/subject/${subject.id}/${m.id}`}
                        className="flex items-center gap-3 rounded-md border border-line px-4 py-2.5 hover:border-accent"
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                            isDone ? 'border-correct bg-correct text-white' : 'border-line text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                        <span className="min-w-0 flex-1 text-sm font-medium">{m.title}</span>
                        <span className="shrink-0 text-xs text-ink-soft">~{m.estMinutes} min</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Interview themes */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">What interviewers ask from this subject</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] marker:text-ink-soft">
          {subject.interviewThemes.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </section>

      {/* Subject mind map */}
      <section className="mt-10">
        <h2 className="text-lg font-bold">Subject mind map</h2>
        <div className="mt-3">
          <Suspense fallback={<div className="h-[420px] animate-pulse rounded-lg bg-raised" />}>
            <MindMap markdown={subject.mindmapMarkdown} title={subject.title} />
          </Suspense>
        </div>
      </section>
    </div>
  )
}
