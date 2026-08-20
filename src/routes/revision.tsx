import { Suspense, lazy, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { SUBJECTS, findModule, loadModule } from '@/content/registry'
import type { Module } from '@/content/types'
import { useApp } from '@/stores/app'
import { localDay } from '@/lib/dates'

const MindMap = lazy(() => import('@/components/MindMap'))

type Found = NonNullable<ReturnType<typeof findModule>>

/** Count "- " outline nodes so the recall test can be scored against something real. */
function countNodes(markdown: string): number {
  return markdown.split('\n').filter((l) => /^\s*-\s/.test(l)).length
}

const mapFrame = 'rounded-lg border border-line bg-white p-3'

function MindMapPane({ module }: { module: Module }) {
  return (
    <div className={mapFrame}>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded bg-raised" />}>
        <MindMap markdown={module.mindmapMarkdown} title={module.title} />
      </Suspense>
    </div>
  )
}

export function Component() {
  const completed = useApp((s) => s.completed)
  const lastRecallDay = useApp((s) => s.lastRecallDay)
  const markRecallDone = useApp((s) => s.markRecallDone)

  // Everything learned, oldest completion first — the recall test should reach
  // for what has had time to fade, not what was finished an hour ago.
  const learned = useMemo(() => {
    const order = new Map(SUBJECTS.map((s, i) => [s.id, i]))
    return Object.entries(completed)
      .map(([id, day]) => {
        const f = findModule(id)
        return f ? { found: f, day } : null
      })
      .filter((x): x is { found: Found; day: string } => x !== null)
      .sort(
        (a, b) =>
          a.day.localeCompare(b.day) ||
          (order.get(a.found.subject.id) ?? 99) - (order.get(b.found.subject.id) ?? 99),
      )
  }, [completed])

  const [mode, setMode] = useState<'browse' | 'recall'>('browse')

  // Browse state
  const [openId, setOpenId] = useState<string | null>(null)
  const [openModule, setOpenModule] = useState<Module | null>(null)

  const open = async (f: Found) => {
    if (openId === f.entry.id) {
      setOpenId(null)
      setOpenModule(null)
      return
    }
    setOpenId(f.entry.id)
    setOpenModule(null)
    setOpenModule(await loadModule(f.entry))
  }

  // Recall state
  const [target, setTarget] = useState<{ found: Found; module: Module } | null>(null)
  const [attempt, setAttempt] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [starting, setStarting] = useState(false)

  const startRecall = async () => {
    setStarting(true)
    // Draw from the older half of what's been learned — that's where the gaps are.
    const pool = learned.slice(0, Math.max(1, Math.ceil(learned.length / 2)))
    const pick = pool[Math.floor(Math.random() * pool.length)]!
    setTarget({ found: pick.found, module: await loadModule(pick.found.entry) })
    setAttempt('')
    setRevealed(false)
    setStarting(false)
  }

  const finishRecall = () => {
    setRevealed(true)
    markRecallDone(localDay())
  }

  if (learned.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-3xl font-bold">Revision mode</h1>
        <div className="mt-6 rounded-lg border border-line bg-raised p-6">
          <p className="font-medium">Nothing completed yet.</p>
          <p className="mt-1 text-ink-soft">
            Revision mode shows the mind maps of everything you've finished, and tests you by making you rebuild one
            from a blank page. Complete a module first.
          </p>
          <Link to="/" className="mt-2 inline-block text-accent hover:underline">
            Back to today's plan →
          </Link>
        </div>
      </div>
    )
  }

  const attemptNodes = countNodes(attempt)

  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      <h1 className="text-3xl font-bold">Revision mode</h1>
      <p className="mt-1 max-w-[70ch] text-ink-soft">
        Mind maps only — {learned.length} module{learned.length === 1 ? '' : 's'} learned. Re-reading feels like
        knowing. Rebuilding from a blank page is the only honest test.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setMode('browse')}
          className={`rounded-full border px-3 py-1 text-sm ${mode === 'browse' ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
        >
          Browse the maps
        </button>
        <button
          onClick={() => setMode('recall')}
          className={`rounded-full border px-3 py-1 text-sm ${mode === 'recall' ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
        >
          Recall test
        </button>
        <span className="ml-auto text-sm text-ink-soft">
          {lastRecallDay ? `Last recall test: ${lastRecallDay}` : 'No recall test taken yet'}
        </span>
      </div>

      {mode === 'browse' && (
        <div className="mt-6 space-y-2">
          {learned.map(({ found, day }) => (
            <div key={found.entry.id} className="rounded-lg border border-line">
              <button
                onClick={() => void open(found)}
                aria-expanded={openId === found.entry.id}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-raised"
              >
                <span className="w-12 shrink-0 font-mono text-xs text-ink-soft">{found.subject.short}</span>
                <span className="flex-1 font-medium">{found.entry.title}</span>
                <span className="shrink-0 text-sm text-ink-soft">{day}</span>
                <span className="shrink-0 text-ink-soft">{openId === found.entry.id ? '▾' : '▸'}</span>
              </button>
              {openId === found.entry.id && (
                <div className="border-t border-line p-3">
                  {openModule ? (
                    <MindMapPane module={openModule} />
                  ) : (
                    <div className="h-[420px] animate-pulse rounded bg-raised" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mode === 'recall' && (
        <div className="mt-6">
          {!target ? (
            <div className="rounded-lg border border-line bg-raised p-6">
              <p className="font-medium">The weekly recall test</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-ink-soft">
                <li>You get one module you finished a while ago — the title only.</li>
                <li>Rebuild its mind map from memory on the blank page. Nodes as "- " bullets, indent for depth.</li>
                <li>Then reveal the real one and count what you <em>missed</em>, not what you got.</li>
              </ol>
              <p className="mt-3 text-ink-soft">
                The gaps become this week's review targets. Don't re-read the whole module.
              </p>
              <button
                onClick={() => void startRecall()}
                disabled={starting}
                className="mt-4 rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50"
              >
                {starting ? 'Drawing…' : 'Draw a module'}
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-lg border border-line bg-raised p-4">
                <p className="text-sm text-ink-soft">
                  {target.found.subject.title} · completed {completed[target.found.entry.id]}
                </p>
                <p className="mt-0.5 text-xl font-bold">{target.module.title}</p>
              </div>

              <div className={`mt-4 grid gap-4 ${revealed ? 'md:grid-cols-2' : ''}`}>
                <div>
                  <p className="mb-1.5 text-sm font-medium">Your reconstruction</p>
                  <textarea
                    value={attempt}
                    onChange={(e) => setAttempt(e.target.value)}
                    readOnly={revealed}
                    spellCheck={false}
                    placeholder={'- Root idea\n  - Branch\n    - Leaf'}
                    className="h-[420px] w-full resize-y rounded-lg border border-line bg-white p-3 font-mono text-sm leading-relaxed focus:border-accent focus:outline-none"
                  />
                  <p className="mt-1 text-sm text-ink-soft">
                    {attemptNodes} node{attemptNodes === 1 ? '' : 's'} written
                    {revealed && ` · the real map has ${countNodes(target.module.mindmapMarkdown)}`}
                  </p>
                </div>

                {revealed && (
                  <div>
                    <p className="mb-1.5 text-sm font-medium">The real map</p>
                    <MindMapPane module={target.module} />
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {!revealed ? (
                  <button
                    onClick={finishRecall}
                    className="rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90"
                  >
                    Reveal and compare
                  </button>
                ) : (
                  <>
                    <Link
                      to={`/subject/${target.found.subject.id}/${target.found.entry.id}`}
                      className="rounded-lg border border-line px-4 py-1.5 font-medium hover:border-accent"
                    >
                      Open the module
                    </Link>
                    <button
                      onClick={() => void startRecall()}
                      className="rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90"
                    >
                      Another one
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setTarget(null)
                    setRevealed(false)
                  }}
                  className="text-ink-soft hover:text-ink"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
