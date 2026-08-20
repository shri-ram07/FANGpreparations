import { useEffect, useRef, useState } from 'react'

interface Props {
  code?: string
  /** Shown in static mode and as the fallback when the runtime can't load. */
  precomputedOutput?: string
  caption?: string
}

type Mode =
  | { kind: 'static' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'running' }
  | { kind: 'failed'; reason: string }

const TIMEOUT_MS = 20_000

// Static-first: an editable code box with precomputed output. "Run live" spawns
// a worker that pulls the Pyodide runtime (~12 MB, CDN-cached). Interrupt =
// worker.terminate() + respawn — no SharedArrayBuffer/COOP-COEP needed.
export default function PythonPlayground({ code: initialCode = '', precomputedOutput = '', caption }: Props) {
  const [code, setCode] = useState(initialCode)
  const [mode, setMode] = useState<Mode>({ kind: 'static' })
  const [output, setOutput] = useState<string[]>([])
  const [result, setResult] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const seqRef = useRef(0)
  const pendingRef = useRef(new Map<number, (msg: { result?: string; error?: string }) => void>())

  useEffect(() => () => workerRef.current?.terminate(), [])

  const spawn = () => {
    workerRef.current?.terminate()
    const worker = new Worker(new URL('../../lib/pyodide.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<Record<string, unknown>>) => {
      const d = e.data
      if (d.id === -1 && typeof d.line === 'string') {
        setOutput((o) => [...o, (d.stream === 'stderr' ? '! ' : '') + String(d.line)])
        return
      }
      const cb = pendingRef.current.get(d.id as number)
      if (cb) {
        pendingRef.current.delete(d.id as number)
        cb(d as { result?: string; error?: string })
      }
    }
    worker.onerror = () => {
      setMode({ kind: 'failed', reason: 'The Python runtime failed to load (offline or CDN blocked).' })
    }
    return worker
  }

  const init = () => {
    setMode({ kind: 'loading' })
    const worker = spawn()
    const id = ++seqRef.current
    const timer = setTimeout(() => {
      worker.terminate()
      setMode({ kind: 'failed', reason: 'Timed out downloading the runtime.' })
    }, 90_000)
    pendingRef.current.set(id, () => {
      clearTimeout(timer)
      setMode({ kind: 'ready' })
    })
    worker.postMessage({ id, init: true })
  }

  const runLive = () => {
    const worker = workerRef.current
    if (!worker) return
    setMode({ kind: 'running' })
    setOutput([])
    setResult(null)
    const id = ++seqRef.current
    const timer = setTimeout(() => {
      worker.terminate()
      workerRef.current = null
      setMode({ kind: 'static' })
      setResult(`Timed out after ${TIMEOUT_MS / 1000}s — runtime stopped. Click "Run live" to restart it.`)
    }, TIMEOUT_MS)
    pendingRef.current.set(id, (msg) => {
      clearTimeout(timer)
      if (msg.error !== undefined) setOutput((o) => [...o, `Error: ${msg.error}`])
      else if (msg.result) setResult(msg.result)
      setMode({ kind: 'ready' })
    })
    worker.postMessage({ id, code })
  }

  const live = mode.kind === 'ready' || mode.kind === 'running'

  return (
    <figure className="my-4">
      <figcaption className="flex items-baseline justify-between rounded-t-lg border border-b-0 border-line bg-raised px-4 py-1.5">
        <span className="text-sm font-medium">{caption ?? 'Python playground'}</span>
        <span className="font-mono text-[11px] text-ink-soft">{live ? 'live · python 3.14' : 'python'}</span>
      </figcaption>
      <textarea
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        rows={Math.min(Math.max(code.split('\n').length + 1, 4), 18)}
        className="block w-full resize-y border border-line bg-bg p-4 font-mono text-[13.5px] leading-relaxed focus:border-accent focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3 rounded-b-lg border border-t-0 border-line px-4 py-2">
        {mode.kind === 'static' && (
          <button onClick={init} className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent/90">
            Run live in your browser
          </button>
        )}
        {mode.kind === 'static' && <span className="text-xs text-ink-soft">~12 MB download the first time, cached after</span>}
        {mode.kind === 'loading' && <span className="text-sm text-ink-soft">Downloading Python runtime… (first time only)</span>}
        {live && (
          <button
            onClick={runLive}
            disabled={mode.kind === 'running'}
            className="rounded-md bg-accent px-3 py-1 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            {mode.kind === 'running' ? 'Running…' : 'Run'}
          </button>
        )}
        {mode.kind === 'running' && (
          <button
            onClick={() => {
              workerRef.current?.terminate()
              workerRef.current = null
              setMode({ kind: 'static' })
            }}
            className="rounded-md border border-wrong px-3 py-1 text-sm text-wrong"
          >
            Stop
          </button>
        )}
        {mode.kind === 'failed' && <span className="text-sm text-wrong">{mode.reason} Showing precomputed output instead.</span>}
      </div>

      {(output.length > 0 || result !== null || !live) && (
        <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-raised p-3 font-mono text-[13px] leading-relaxed whitespace-pre-wrap">
          {live
            ? [...output, ...(result !== null && result !== '' ? [result] : [])].join('\n') || '(no output yet — hit Run)'
            : precomputedOutput || '(run to see output)'}
        </pre>
      )}
    </figure>
  )
}
