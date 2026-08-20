import { useEffect, useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'

type JoinType = 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS'

interface User {
  id: number
  name: string
  cityId: number | null
}

interface City {
  id: number
  city: string
}

interface ResultRow {
  u: User | null
  c: City | null
}

interface Frame {
  userIdx: number | null
  cityIdx: number | null
  mark: 'match' | 'none' | null
  markSlot: number | null
  rows: ResultRow[]
  appended: number
  note: string
  tone: 'info' | 'match' | 'drop' | 'pad'
}

const USERS: User[] = [
  { id: 1, name: 'Ana', cityId: 10 },
  { id: 2, name: 'Ben', cityId: 20 },
  { id: 3, name: 'Cai', cityId: 30 },
  { id: 4, name: 'Dev', cityId: null },
  { id: 5, name: 'Eli', cityId: 9 },
]

const CITIES: City[] = [
  { id: 10, city: 'Pune' },
  { id: 20, city: 'Delhi' },
  { id: 30, city: 'Goa' },
  { id: 40, city: 'Agra' },
]

const JOIN_TYPES: JoinType[] = ['INNER', 'LEFT', 'RIGHT', 'FULL', 'CROSS']

const CLAUSE: Record<JoinType, string> = {
  INNER: 'users INNER JOIN cities ON users.city_id = cities.id',
  LEFT: 'users LEFT JOIN cities ON users.city_id = cities.id',
  RIGHT: 'users RIGHT JOIN cities ON users.city_id = cities.id',
  FULL: 'users FULL JOIN cities ON users.city_id = cities.id',
  CROSS: 'users CROSS JOIN cities',
}

const INTRO: Record<JoinType, string> = {
  INNER: 'Scan users top to bottom, probing cities for a city_id match. Only matched pairs survive.',
  LEFT: 'Scan users top to bottom. Matches join; misses are kept and NULL-padded.',
  RIGHT: 'RIGHT drives from cities — scan cities, probing users. Every city survives.',
  FULL: 'Scan users like LEFT, then sweep cities for any row nothing matched.',
  CROSS: 'No ON clause — pair every user with every city. 5 × 4 = 20 rows.',
}

function simulate(jt: JoinType): Frame[] {
  const frames: Frame[] = []
  const rows: ResultRow[] = []
  const push = (f: Omit<Frame, 'rows'>) => frames.push({ ...f, rows: [...rows] })

  push({ userIdx: null, cityIdx: null, mark: null, markSlot: null, appended: 0, note: INTRO[jt], tone: 'info' })

  if (jt === 'CROSS') {
    USERS.forEach((u, ui) =>
      CITIES.forEach((c, ci) => {
        rows.push({ u, c })
        push({
          userIdx: ui,
          cityIdx: ci,
          mark: 'match',
          markSlot: ui,
          appended: 1,
          note: `(${u.name}) × (${c.city}) — CROSS emits every pair, no predicate to fail.`,
          tone: 'info',
        })
      }),
    )
    return frames
  }

  if (jt !== 'RIGHT') {
    USERS.forEach((u, ui) => {
      const ci = CITIES.findIndex((c) => u.cityId !== null && c.id === u.cityId)
      if (ci >= 0) {
        const c = CITIES[ci]!
        rows.push({ u, c })
        push({
          userIdx: ui,
          cityIdx: ci,
          mark: 'match',
          markSlot: ui,
          appended: 1,
          note: `city_id ${u.cityId} = cities.id ${c.id} → match. Emit (${u.name}, ${c.city}).`,
          tone: 'match',
        })
      } else {
        const why = u.cityId === null ? 'city_id NULL never equals anything' : `city_id ${u.cityId} has no match`
        if (jt === 'INNER') {
          push({
            userIdx: ui,
            cityIdx: null,
            mark: 'none',
            markSlot: ui,
            appended: 0,
            note: `${why} — INNER drops this row silently.`,
            tone: 'drop',
          })
        } else {
          rows.push({ u, c: null })
          push({
            userIdx: ui,
            cityIdx: null,
            mark: 'none',
            markSlot: ui,
            appended: 1,
            note: `${why} — ${jt} keeps ${u.name} and pads the city columns with NULL.`,
            tone: 'pad',
          })
        }
      }
    })
  }

  if (jt === 'RIGHT') {
    CITIES.forEach((c, ci) => {
      const ui = USERS.findIndex((u) => u.cityId === c.id)
      if (ui >= 0) {
        const u = USERS[ui]!
        rows.push({ u, c })
        push({
          userIdx: ui,
          cityIdx: ci,
          mark: 'match',
          markSlot: ci,
          appended: 1,
          note: `users.city_id ${u.cityId} = cities.id ${c.id} → match. Emit (${u.name}, ${c.city}).`,
          tone: 'match',
        })
      } else {
        rows.push({ u: null, c })
        push({
          userIdx: null,
          cityIdx: ci,
          mark: 'none',
          markSlot: ci,
          appended: 1,
          note: `no user has city_id ${c.id} — RIGHT keeps ${c.city} and pads the user columns with NULL.`,
          tone: 'pad',
        })
      }
    })
  }

  if (jt === 'FULL') {
    CITIES.forEach((c, ci) => {
      if (USERS.some((u) => u.cityId === c.id)) return
      rows.push({ u: null, c })
      push({
        userIdx: null,
        cityIdx: ci,
        mark: 'none',
        markSlot: ci,
        appended: 1,
        note: `no user has city_id ${c.id} — FULL sweeps up ${c.city} with NULL user columns.`,
        tone: 'pad',
      })
    })
  }

  return frames
}

// final row count per join type, computed from the same simulate() the stepper uses
const FINAL_COUNTS = JOIN_TYPES.map((t) => {
  const fs = simulate(t)
  return { t, n: fs[fs.length - 1]!.rows.length }
})

const HILITE = { backgroundColor: 'rgba(36,80,229,0.10)' }
const NEW_ROW = { backgroundColor: 'rgba(36,80,229,0.07)' }

function Cell({ v }: { v: number | string | null }) {
  return v === null ? <span className="italic text-ink-soft opacity-60">NULL</span> : <>{v}</>
}

const th = 'h-7 border-b border-line bg-raised px-2 text-left font-medium text-ink-soft'
const td = 'border-t border-line px-2'

export default function JoinVisualizer() {
  const [joinType, setJoinType] = useState<JoinType>('INNER')
  const frames = useMemo(() => simulate(joinType), [joinType])
  const stepper = useStepper(frames.length, 650)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinType])

  const f = frames[stepper.step]!
  const firstNew = f.rows.length - f.appended

  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [f.rows.length])

  return (
    <InteractiveShell
      title="Five joins, same two tables"
      notice="LEFT keeps every left row and writes NULL receipts for the misses; INNER just deletes them — when a report 'loses rows', this picture is the first thing to check."
      onReset={() => {
        setJoinType('INNER')
        reset()
      }}
    >
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        {JOIN_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setJoinType(t)}
            className={`rounded-full border px-2.5 py-0.5 font-mono text-xs ${
              t === joinType ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <p className="mb-2 font-mono text-xs text-ink-soft">{CLAUSE[joinType]}</p>

      {/* Venn shorthand — the picture everyone draws; the row-level tables below
          are what actually happens. Both, so the shorthand never misleads. */}
      <div className="mb-3 flex items-center gap-3">
        <svg viewBox="0 0 150 76" className="h-[4.5rem] w-auto shrink-0 select-none" aria-label={`${joinType} join Venn`}>
          <defs>
            <clipPath id="jv-left">
              <circle cx="58" cy="31" r="26" />
            </clipPath>
            <clipPath id="jv-right">
              <circle cx="92" cy="31" r="26" />
            </clipPath>
          </defs>
          {/* shaded region depends on the join type */}
          {(joinType === 'LEFT' || joinType === 'FULL' || joinType === 'CROSS') && (
            <circle cx="58" cy="31" r="26" fill="#2450E5" opacity={0.22} />
          )}
          {(joinType === 'RIGHT' || joinType === 'FULL' || joinType === 'CROSS') && (
            <circle cx="92" cy="31" r="26" fill="#2450E5" opacity={0.22} />
          )}
          {joinType !== 'CROSS' && (
            <g clipPath="url(#jv-left)">
              <circle cx="92" cy="31" r="26" fill="#2450E5" opacity={0.45} />
            </g>
          )}
          <circle cx="58" cy="31" r="26" fill="none" stroke="#5A5F6A" strokeWidth={1} />
          <circle cx="92" cy="31" r="26" fill="none" stroke="#5A5F6A" strokeWidth={1} />
          <text x="45" y="70" textAnchor="middle" fontSize={9} fill="#5A5F6A" fontFamily="JetBrains Mono, monospace">
            users
          </text>
          <text x="105" y="70" textAnchor="middle" fontSize={9} fill="#5A5F6A" fontFamily="JetBrains Mono, monospace">
            cities
          </text>
        </svg>
        <p className="text-[12px] text-ink-soft">
          {joinType === 'CROSS'
            ? 'CROSS ignores the circles entirely — every left row pairs with every right row (m x n).'
            : 'The shaded region is what survives. Useful shorthand — but a Venn hides row FAN-OUT: one left row matching three right rows becomes three result rows. The tables below show the truth.'}
        </p>
      </div>

      <div className="flex items-start justify-center gap-2">
        <div>
          <div className="mb-1 font-mono text-[11px] text-ink-soft">users</div>
          <table className="border border-line font-mono text-xs">
            <thead>
              <tr className="h-7">
                <th className={th}>id</th>
                <th className={th}>name</th>
                <th className={th}>city_id</th>
              </tr>
            </thead>
            <tbody>
              {USERS.map((u, i) => (
                <tr key={u.id} className="h-7" style={i === f.userIdx ? HILITE : undefined}>
                  <td className={td}>{u.id}</td>
                  <td className={td}>{u.name}</td>
                  <td className={td}>
                    <Cell v={u.cityId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* row connector: current step's verdict, aligned to the driving row */}
        <div className="w-7 text-center">
          <div className="mb-1 text-[11px]">&nbsp;</div>
          <div className="h-7" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`flex h-7 items-center justify-center font-mono text-sm ${
                f.mark === 'match' ? 'text-correct' : 'text-wrong'
              }`}
            >
              {f.markSlot === i ? (f.mark === 'match' ? '✓' : '∅') : ''}
            </div>
          ))}
        </div>

        <div>
          <div className="mb-1 font-mono text-[11px] text-ink-soft">cities</div>
          <table className="border border-line font-mono text-xs">
            <thead>
              <tr className="h-7">
                <th className={th}>id</th>
                <th className={th}>city</th>
              </tr>
            </thead>
            <tbody>
              {CITIES.map((c, i) => (
                <tr key={c.id} className="h-7" style={i === f.cityIdx ? HILITE : undefined}>
                  <td className={td}>{c.id}</td>
                  <td className={td}>{c.city}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className={`my-2 min-h-10 font-mono text-[13px] ${f.tone === 'drop' ? 'text-wrong' : 'text-ink'}`}>{f.note}</p>

      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[11px] text-ink-soft">result</span>
        <span className="font-mono text-xs text-ink-soft">
          {f.rows.length} row{f.rows.length === 1 ? '' : 's'}
        </span>
      </div>
      <div ref={listRef} className="max-h-56 overflow-y-auto">
        <table className="w-full border border-line font-mono text-xs">
          <thead>
            <tr className="h-7">
              <th className={th}>users.id</th>
              <th className={th}>name</th>
              <th className={th}>city_id</th>
              <th className={th}>cities.id</th>
              <th className={th}>city</th>
            </tr>
          </thead>
          <tbody>
            {f.rows.length === 0 && (
              <tr className="h-7">
                <td className={`${td} italic text-ink-soft opacity-60`} colSpan={5}>
                  empty
                </td>
              </tr>
            )}
            {f.rows.map((r, i) => (
              <tr key={i} className="h-7" style={i >= firstNew ? NEW_ROW : undefined}>
                <td className={td}>
                  <Cell v={r.u ? r.u.id : null} />
                </td>
                <td className={td}>
                  <Cell v={r.u ? r.u.name : null} />
                </td>
                <td className={td}>
                  <Cell v={r.u ? r.u.cityId : null} />
                </td>
                <td className={td}>
                  <Cell v={r.c ? r.c.id : null} />
                </td>
                <td className={td}>
                  <Cell v={r.c ? r.c.city : null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stepper.atEnd && (
        <div className="mt-2 rounded-md border border-line bg-raised px-3 py-1.5 font-mono text-xs text-ink-soft">
          {FINAL_COUNTS.map(({ t, n }, i) => (
            <span key={t}>
              {i > 0 && ' · '}
              <span className={t === joinType ? 'font-semibold text-accent' : undefined}>
                {t} {n}
              </span>
            </span>
          ))}
        </div>
      )}

      <div className="mt-3">
        <StepControls stepper={stepper} total={frames.length} />
      </div>
    </InteractiveShell>
  )
}
