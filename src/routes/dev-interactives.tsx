import { Suspense } from 'react'
import { useSearchParams } from 'react-router'
import { visuals, type VisualKey } from '@/components/visuals/registry'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Dev-only gallery: every registered interactive, in isolation.
// ?only=BigOGrowthChart renders one. Props beyond defaults go here.
const demoProps: Partial<Record<VisualKey, Record<string, unknown>>> = {
  PointerBoxDiagram: {
    frames: [
      {
        note: 'int x = 42; — a value living directly on the stack.',
        stack: [{ name: 'int x', value: '42' }],
        heap: [],
      },
      {
        note: 'int* p = new int(7); — p holds an ADDRESS; the 7 lives on the heap.',
        stack: [
          { name: 'int x', value: '42' },
          { name: 'int* p', to: 'a' },
        ],
        heap: [{ id: 'a', value: '7', label: '0x5f3a' }],
      },
      {
        note: 'delete p; — the heap cell is gone, but p still holds the old address. Dangling.',
        stack: [
          { name: 'int x', value: '42' },
          { name: 'int* p', to: 'a', danger: true },
        ],
        heap: [{ id: 'a', value: '?', freed: true }],
      },
    ],
  },
  PythonPlayground: {
    code: "nums = [1, 2, 3]\nprint(sum(n * n for n in nums))",
    precomputedOutput: '14',
    caption: 'demo snippet',
  },
}

export function Component() {
  const [params] = useSearchParams()
  const only = params.get('only')
  const keys = (Object.keys(visuals) as VisualKey[]).filter((k) => !only || k === only)

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-bold">Interactive gallery (dev)</h1>
      <p className="mt-1 text-sm text-ink-soft">{keys.length} components · add ?only=Name to isolate one</p>
      <div className="mt-6">
        {keys.map((k) => {
          const C = visuals[k] as React.ComponentType<Record<string, unknown>>
          return (
            <section key={k} className="mb-10">
              <h2 className="mb-1 font-mono text-sm text-ink-soft">{k}</h2>
              <ErrorBoundary
                fallback={<div className="rounded-lg border border-wrong bg-wrong/5 p-4 text-sm text-wrong">{k} crashed — check the console.</div>}
              >
                <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-raised" />}>
                  <C {...(demoProps[k] ?? {})} />
                </Suspense>
              </ErrorBoundary>
            </section>
          )
        })}
      </div>
    </div>
  )
}
