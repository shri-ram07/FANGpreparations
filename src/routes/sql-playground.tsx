import { useCallback, useEffect, useMemo, useState } from 'react'
import type { QueryExecResult } from 'sql.js'
import { getDb, freshDb, resetDb, type DbName } from '@/lib/sqlite'
import { SQL_EXERCISES, type SqlExercise } from '@/data/sql/exercises'

type RunState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; results: QueryExecResult[]; ms: number }
  | { status: 'error'; message: string }

type CheckState = { verdict: 'pass' } | { verdict: 'fail'; expected: QueryExecResult | null } | null

interface TableInfo {
  name: string
  columns: string[]
}

const ROW_CAP = 500

// Shape-normalized compare: column COUNT (not names — aliasing a correct query
// shouldn't fail it), row multiset (sorted unless the exercise demands order).
function resultsEqual(a: QueryExecResult | undefined, b: QueryExecResult | undefined, ordered = false): boolean {
  if (!a || !b) return !a && !b
  if (a.columns.length !== b.columns.length) return false
  const norm = (r: QueryExecResult) => {
    const rows = r.values.map((v) => JSON.stringify(v))
    return (ordered ? rows : [...rows].sort()).join('\n')
  }
  return norm(a) === norm(b)
}

function ResultTable({ r }: { r: QueryExecResult }) {
  const capped = r.values.slice(0, ROW_CAP)
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-raised text-left">
            {r.columns.map((c, i) => (
              <th key={i} className="border-b border-line px-3 py-1.5 font-mono text-xs font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {capped.map((row, i) => (
            <tr key={i} className="odd:bg-bg even:bg-raised/40">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1 font-mono text-xs">
                  {cell === null ? <span className="text-ink-soft italic">NULL</span> : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {r.values.length > ROW_CAP && (
        <p className="border-t border-line px-3 py-1 text-xs text-ink-soft">
          showing first {ROW_CAP} of {r.values.length} rows
        </p>
      )}
      {r.values.length === 0 && <p className="px-3 py-2 text-xs text-ink-soft">0 rows</p>}
    </div>
  )
}

export function Component() {
  const [dbName, setDbName] = useState<DbName>('ecommerce')
  const [engineReady, setEngineReady] = useState(false)
  const [schema, setSchema] = useState<TableInfo[]>([])
  const [sql, setSql] = useState('SELECT * FROM products LIMIT 5;')
  const [run, setRun] = useState<RunState>({ status: 'idle' })
  const [exercise, setExercise] = useState<SqlExercise | null>(null)
  const [check, setCheck] = useState<CheckState>(null)
  const [showHint, setShowHint] = useState(false)

  const loadSchema = useCallback(async (name: DbName) => {
    const db = await getDb(name)
    const tables =
      db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]
        ?.values.map((v) => String(v[0])) ?? []
    setSchema(
      tables.map((t) => ({
        name: t,
        columns: db.exec(`PRAGMA table_info(${t})`)[0]?.values.map((v) => `${String(v[1])} ${String(v[2] ?? '')}`.trim()) ?? [],
      })),
    )
    setEngineReady(true)
  }, [])

  useEffect(() => {
    setEngineReady(false)
    void loadSchema(dbName)
  }, [dbName, loadSchema])

  const execute = useCallback(async () => {
    setRun({ status: 'loading' })
    setCheck(null)
    try {
      const db = await getDb(dbName)
      const t0 = performance.now()
      const results = db.exec(sql)
      setRun({ status: 'ok', results, ms: Math.round(performance.now() - t0) })
      void loadSchema(dbName) // user may have created/dropped tables
    } catch (e) {
      setRun({ status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [dbName, sql, loadSchema])

  const checkExercise = useCallback(async () => {
    if (!exercise) return
    try {
      const userDb = await freshDb(exercise.db) // fresh both sides: session mutations can't skew it
      const userRes = userDb.exec(sql).at(-1)
      userDb.close()
      const solDb = await freshDb(exercise.db)
      const solRes = solDb.exec(exercise.solution).at(-1)
      solDb.close()
      setCheck(resultsEqual(userRes, solRes, exercise.ordered) ? { verdict: 'pass' } : { verdict: 'fail', expected: solRes ?? null })
    } catch (e) {
      setRun({ status: 'error', message: e instanceof Error ? e.message : String(e) })
    }
  }, [exercise, sql])

  const exercises = useMemo(() => SQL_EXERCISES.filter((e) => e.db === dbName), [dbName])

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">SQL playground</h1>
        <span className="text-sm text-ink-soft">real SQLite, in your browser</span>
        <div className="ml-auto flex items-center gap-1.5">
          {(['ecommerce', 'employees'] as DbName[]).map((n) => (
            <button
              key={n}
              onClick={() => {
                setDbName(n)
                setExercise(null)
                setRun({ status: 'idle' })
              }}
              className={`rounded-full border px-3 py-1 text-sm ${dbName === n ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
            >
              {n}
            </button>
          ))}
          <button
            onClick={() => {
              void resetDb(dbName).then(() => loadSchema(dbName))
              setRun({ status: 'idle' })
            }}
            className="rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-wrong hover:text-wrong"
            title="Re-seed the database (undoes your DROPs and DELETEs)"
          >
            Reset DB
          </button>
        </div>
      </header>

      {!engineReady && <p className="mt-4 text-sm text-ink-soft">Loading SQLite engine (~0.4 MB, cached after the first time)…</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]">
        {/* schema panel */}
        <aside className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wide text-ink-soft uppercase">Schema</h2>
          {schema.map((t) => (
            <div key={t.name} className="rounded-lg border border-line p-2.5">
              <p className="font-mono text-xs font-semibold">{t.name}</p>
              <ul className="mt-1 space-y-0.5">
                {t.columns.map((c) => (
                  <li key={c} className="font-mono text-[11px] text-ink-soft">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="min-w-0">
          {/* exercises — 30+ per DB, so cap the height and let it scroll */}
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
              Exercises ({exercises.length})
            </span>
            <span className="text-xs text-ink-soft">pick one, write the query, hit Check</span>
          </div>
          <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line bg-raised/40 p-2">
            {exercises.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  setExercise(exercise?.id === ex.id ? null : ex)
                  setCheck(null)
                  setShowHint(false)
                }}
                className={`rounded-full border px-2.5 py-0.5 text-xs ${exercise?.id === ex.id ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'}`}
              >
                {ex.title}
              </button>
            ))}
          </div>
          {exercise && (
            <div className="mt-3 rounded-lg border-l-[3px] border-accent bg-raised px-4 py-3">
              <p className="text-[15px]">{exercise.prompt}</p>
              <div className="mt-2 flex items-center gap-3 text-sm">
                <button onClick={() => void checkExercise()} className="rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent/90">
                  Check my query
                </button>
                {exercise.hint && (
                  <button onClick={() => setShowHint(!showHint)} className="text-accent hover:underline">
                    {showHint ? 'Hide hint' : 'Hint'}
                  </button>
                )}
                {check?.verdict === 'pass' && <span className="font-medium text-correct">✓ Correct</span>}
                {check?.verdict === 'fail' && <span className="font-medium text-wrong">Not yet — expected result below</span>}
              </div>
              {showHint && exercise.hint && <p className="mt-2 text-sm text-ink-soft">{exercise.hint}</p>}
            </div>
          )}

          {/* editor */}
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault()
                void execute()
              }
            }}
            spellCheck={false}
            rows={7}
            className="mt-4 w-full resize-y rounded-lg border border-line bg-bg p-3 font-mono text-sm leading-relaxed focus:border-accent focus:outline-none"
            placeholder="SELECT …"
          />
          <div className="mt-2 flex items-center gap-3">
            <button onClick={() => void execute()} disabled={!engineReady} className="rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50">
              Run
            </button>
            <span className="text-xs text-ink-soft">Ctrl+Enter runs. Mutations stick until Reset DB.</span>
            {run.status === 'ok' && <span className="ml-auto font-mono text-xs text-ink-soft">{run.ms} ms</span>}
          </div>

          {/* results */}
          <div className="mt-4 space-y-4">
            {run.status === 'error' && (
              <div className="rounded-lg border border-wrong bg-wrong/5 px-4 py-3">
                <p className="font-mono text-sm text-wrong">{run.message}</p>
              </div>
            )}
            {run.status === 'ok' && run.results.length === 0 && (
              <p className="text-sm text-ink-soft">Statement ran — no rows to show (DDL/INSERT/UPDATE).</p>
            )}
            {run.status === 'ok' && run.results.map((r, i) => <ResultTable key={i} r={r} />)}
            {check?.verdict === 'fail' && (
              <div>
                <p className="mb-1 text-sm font-medium text-ink-soft">Expected result{exercise?.ordered ? ' (order matters here)' : ' (any row order)'}:</p>
                {check.expected ? <ResultTable r={check.expected} /> : <p className="text-sm text-ink-soft">an empty result</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
