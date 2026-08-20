// Pyodide lives ONLY in this worker file (keeps the optimizeDeps.exclude
// surface to one module). Runtime assets come from the jsDelivr CDN, pinned to
// the exact npm version — they must never drift apart.
import { loadPyodide } from 'pyodide'

const INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.4/full/'

type InMsg = { id: number; init?: boolean; code?: string }
type OutMsg =
  | { id: number; ready: true }
  | { id: -1; stream: 'stdout' | 'stderr'; line: string }
  | { id: number; result: string }
  | { id: number; error: string }

const ctx = self as unknown as Worker
let pyodide: Awaited<ReturnType<typeof loadPyodide>> | null = null

ctx.onmessage = async (e: MessageEvent<InMsg>) => {
  const { id, init, code } = e.data
  try {
    if (init) {
      pyodide = await loadPyodide({
        indexURL: INDEX_URL,
        stdout: (line: string) => ctx.postMessage({ id: -1, stream: 'stdout', line } satisfies OutMsg),
        stderr: (line: string) => ctx.postMessage({ id: -1, stream: 'stderr', line } satisfies OutMsg),
      })
      ctx.postMessage({ id, ready: true } satisfies OutMsg)
      return
    }
    if (!pyodide) throw new Error('runtime not initialized')
    const result: unknown = await pyodide.runPythonAsync(code ?? '')
    ctx.postMessage({ id, result: result === undefined || result === null ? '' : String(result) } satisfies OutMsg)
  } catch (err) {
    ctx.postMessage({ id, error: err instanceof Error ? err.message : String(err) } satisfies OutMsg)
  }
}
