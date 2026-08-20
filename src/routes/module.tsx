import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { findModuleEntry, loadModule } from '@/content/registry'
import type { Module } from '@/content/types'
import { useApp } from '@/stores/app'
import { SectionRenderer } from '@/components/sections/SectionRenderer'
import { QuizBlock } from '@/components/QuizBlock'
import { InterviewBlock } from '@/components/InterviewBlock'

const MindMap = lazy(() => import('@/components/MindMap'))

export function Component() {
  const { subjectId = '', moduleId = '' } = useParams()
  const found = useMemo(() => findModuleEntry(subjectId, moduleId), [subjectId, moduleId])
  const [module, setModule] = useState<Module | null>(null)
  const setLastVisited = useApp((s) => s.setLastVisited)
  const completeModule = useApp((s) => s.completeModule)
  const completedOn = useApp((s) => s.completed[moduleId])

  useEffect(() => {
    if (found) setLastVisited(found.subject.id, found.entry.id)
  }, [found, setLastVisited])

  useEffect(() => {
    let live = true
    setModule(null)
    if (found) {
      void loadModule(found.entry).then((m) => {
        if (live) setModule(m)
      })
    }
    return () => {
      live = false
    }
  }, [found])

  if (!found) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-2xl font-bold">Module not found</h1>
        <Link to="/" className="text-accent hover:underline">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { subject, entry } = found

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      {/* Hook — renders instantly from registry metadata, before content loads */}
      <nav className="text-sm text-ink-soft">
        <Link to={`/subject/${subject.id}`} className="hover:text-accent">
          {subject.title}
        </Link>
        <span className="mx-1.5">/</span>
        <span>{entry.title}</span>
      </nav>
      <h1 className="mt-1 text-3xl font-bold">{entry.title}</h1>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="rounded-full border border-line px-2 py-0.5 font-mono">L{entry.level}</span>
        <span className="rounded-full border border-line px-2 py-0.5">~{entry.estMinutes} min</span>
      </div>

      {module ? (
        <>
          {module.assumes && module.assumes.length > 0 && (
            <aside className="mt-5 max-w-[70ch] rounded-lg border border-line px-4 py-3">
              <p className="text-[13px] font-semibold tracking-wide text-ink-soft uppercase">Before you start</p>
              <ul className="mt-1 space-y-0.5">
                {module.assumes.map((a) => (
                  <li key={a} className="text-[15px]">
                    {a}
                  </li>
                ))}
              </ul>
            </aside>
          )}

          <aside className="mt-5 max-w-[70ch] border-l-[3px] border-accent bg-raised px-4 py-3">
            <p className="text-[13px] font-semibold tracking-wide text-ink-soft uppercase">Why this matters for FAANG</p>
            <p className="mt-1">{module.whyItMatters}</p>
          </aside>

          <div className="mt-4">
            {module.sections.map((s, i) => (
              <SectionRenderer key={i} s={s} />
            ))}
          </div>

          <QuizBlock quiz={module.quiz} />
          <InterviewBlock moduleId={module.id} questions={module.interviewQuestions} />

          <section className="my-8">
            <h2 className="text-xl font-bold">Mind map — the whole module on one screen</h2>
            <div className="mt-3">
              <Suspense fallback={<div className="h-[420px] animate-pulse rounded-lg bg-raised" />}>
                <MindMap markdown={module.mindmapMarkdown} title={module.title} />
              </Suspense>
            </div>
          </section>

          <section className="my-10 border-t border-line pt-6">
            {completedOn ? (
              <p className="font-medium text-correct">
                ✓ Completed on {completedOn}. {module.flashcards.length} flashcards are cycling in your review queue.
              </p>
            ) : (
              <button
                onClick={() => completeModule(subject.id, module.id, module.flashcards.length)}
                className="rounded-lg bg-accent px-5 py-2.5 font-display font-medium text-white transition-transform hover:bg-accent/90 active:scale-95"
              >
                Mark complete — spawn {module.flashcards.length} flashcards
              </button>
            )}
          </section>
        </>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="h-24 animate-pulse rounded-lg bg-raised" />
          <div className="h-64 animate-pulse rounded-lg bg-raised" />
        </div>
      )}
    </div>
  )
}
