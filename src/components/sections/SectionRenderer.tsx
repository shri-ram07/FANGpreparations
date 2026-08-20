import { Suspense, lazy, useState, type ComponentType } from 'react'
import type { Section } from '@/content/types'
import { visuals } from '@/components/visuals/registry'
import { Md } from '@/lib/md'
import { CodeBlock } from '@/components/CodeBlock'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useApp } from '@/stores/app'

const MathTex = lazy(() => import('@/components/MathTex'))

function IntuitionSection({ title, md }: { title?: string; md: string }) {
  return (
    <section className="my-5">
      {title && <h2 className="mb-2 text-xl font-bold">{title}</h2>}
      <Md text={md} />
    </section>
  )
}

function HinglishBox({ md }: { md: string }) {
  const on = useApp((s) => s.hinglishOn)
  if (!on) return null
  return (
    <aside className="my-4 max-w-[70ch] rounded-r-lg border-l-[3px] border-energy bg-hinglish px-4 py-3">
      <p className="mb-1 text-[13px] font-semibold text-ink-soft">🗣 Seedhi baat</p>
      <Md text={md} />
    </aside>
  )
}

function NoteBox({ md }: { md: string }) {
  return (
    <aside className="my-4 max-w-[70ch] rounded-lg border border-line bg-raised px-4 py-3">
      <p className="mb-1 text-[13px] font-semibold tracking-wide text-ink-soft uppercase">Note</p>
      <Md text={md} />
    </aside>
  )
}

// KaTeX (the MathTex chunk) loads only when the expander is first opened —
// a module page whose math stays collapsed never fetches it.
function MathSection({ intro, latex }: { intro?: string; latex: string[] }) {
  const [opened, setOpened] = useState(false)
  return (
    <details
      className="my-4 max-w-[70ch] rounded-lg border border-line"
      onToggle={(e) => e.currentTarget.open && setOpened(true)}
    >
      <summary className="cursor-pointer px-4 py-2.5 font-medium text-accent select-none">Show the math</summary>
      <div className="border-t border-line px-4 py-3">
        {intro && <Md text={intro} />}
        {opened && (
          <Suspense
            fallback={
              <div className="space-y-2 font-mono text-sm text-ink-soft">
                {latex.map((t, i) => (
                  <div key={i}>{t}</div>
                ))}
              </div>
            }
          >
            {latex.map((t, i) => (
              <MathTex key={i} tex={t} />
            ))}
          </Suspense>
        )}
      </div>
    </details>
  )
}

function VisualSectionView({ s }: { s: Extract<Section, { type: 'visual' }> }) {
  const C = visuals[s.component] as ComponentType<Record<string, unknown>>
  return (
    <ErrorBoundary
      fallback={
        <div className="my-4 rounded-lg border border-wrong/40 bg-raised p-4 text-sm text-ink-soft">
          The interactive "{s.component}" failed to load. Refresh to retry.
        </div>
      }
    >
      <Suspense fallback={<div className="my-4 h-64 animate-pulse rounded-lg bg-raised" />}>
        <C {...(s.props as Record<string, unknown>)} />
      </Suspense>
    </ErrorBoundary>
  )
}

function assertNever(x: never): never {
  throw new Error(`Unhandled section: ${JSON.stringify(x)}`)
}

export function SectionRenderer({ s }: { s: Section }) {
  switch (s.type) {
    case 'intuition':
      return <IntuitionSection title={s.title} md={s.md} />
    case 'hinglish':
      return <HinglishBox md={s.md} />
    case 'note':
      return <NoteBox md={s.md} />
    case 'math':
      return <MathSection intro={s.intro} latex={s.latex} />
    case 'code':
      return <CodeBlock code={s.code} lang={s.lang} title={s.title} annotations={s.annotations} />
    case 'visual':
      return <VisualSectionView s={s} />
    default:
      return assertNever(s)
  }
}
