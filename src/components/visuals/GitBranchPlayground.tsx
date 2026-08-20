import { useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_GRID, CHART_SERIES } from './shell/colors'

type Lane = 'main' | 'feature'

interface Commit {
  id: string
  parents: string[]
  lane: Lane
  ghost: boolean
}

interface Repo {
  commits: Commit[]
  main: string
  feature: string | null
  head: Lane
  note: string
  tone: 'plain' | 'good' | 'warn'
  n: number
}

const CAP = 12
const X0 = 34
const COL_W = 46
const LANE_Y: Record<Lane, number> = { main: 100, feature: 200 }
const R = 13
const MAIN = CHART_SERIES[0]
const FEAT = CHART_SERIES[1]

const initial = (): Repo => ({
  commits: [
    { id: 'c1', parents: [], lane: 'main', ghost: false },
    { id: 'c2', parents: ['c1'], lane: 'main', ghost: false },
  ],
  main: 'c2',
  feature: null,
  head: 'main',
  note: 'Two commits on main. HEAD marks the branch your next commit lands on.',
  tone: 'plain',
  n: 3,
})

function ancestors(commits: Commit[], from: string): Set<string> {
  const byId = new Map(commits.map((c) => [c.id, c]))
  const seen = new Set<string>()
  const stack = [from]
  while (stack.length > 0) {
    const id = stack.pop()!
    if (seen.has(id)) continue
    seen.add(id)
    for (const p of byId.get(id)!.parents) stack.push(p)
  }
  return seen
}

function doCommit(r: Repo): Repo {
  const tip = r.head === 'feature' && r.feature !== null ? r.feature : r.main
  const id = `c${r.n}`
  return {
    ...r,
    commits: [...r.commits, { id, parents: [tip], lane: r.head, ghost: false }],
    main: r.head === 'main' ? id : r.main,
    feature: r.head === 'feature' ? id : r.feature,
    note: `${id} committed on ${r.head} — the ${r.head} pointer moved forward one node. That is all a commit does to a branch.`,
    tone: 'plain',
    n: r.n + 1,
  }
}

function doBranch(r: Repo): Repo {
  return {
    ...r,
    feature: r.main,
    note: `feature created — just a new pointer at ${r.main}, nothing copied. HEAD is still on main (git branch ≠ git switch).`,
    tone: 'plain',
  }
}

function doSwitch(r: Repo): Repo {
  if (r.feature === null) return r
  const to: Lane = r.head === 'main' ? 'feature' : 'main'
  const tip = to === 'main' ? r.main : r.feature
  return {
    ...r,
    head: to,
    note: `HEAD → ${to} (${tip}). Same commits, different pointer — the next commit lands on ${to}.`,
    tone: 'plain',
  }
}

function doMerge(r: Repo): Repo {
  if (r.feature === null) return r
  const featTip = r.feature
  const featAnc = ancestors(r.commits, featTip)
  if (featAnc.has(r.main)) {
    return {
      ...r,
      main: featTip,
      head: 'main',
      note: `fast-forward: main never diverged from feature, so the main label just slid forward to ${featTip} — no merge commit at all.`,
      tone: 'good',
    }
  }
  const id = `c${r.n}`
  return {
    ...r,
    commits: [...r.commits, { id, parents: [r.main, featTip], lane: 'main', ghost: false }],
    main: id,
    head: 'main',
    note: `merge commit ${id} has TWO parents (${r.main} + ${featTip}) — the knot that ties both histories together. Nothing rewritten.`,
    tone: 'good',
    n: r.n + 1,
  }
}

function doRebase(r: Repo): Repo {
  if (r.feature === null) return r
  const featAnc = ancestors(r.commits, r.feature)
  const mainAnc = ancestors(r.commits, r.main)
  const unique = r.commits.filter((c) => featAnc.has(c.id) && !mainAnc.has(c.id))
  const copies: Commit[] = []
  let parent = r.main
  for (const u of unique) {
    const id = `${u.id}′`
    copies.push({ id, parents: [parent], lane: 'feature', ghost: false })
    parent = id
  }
  return {
    ...r,
    commits: [
      ...r.commits.map((c) => (featAnc.has(c.id) && !mainAnc.has(c.id) ? { ...c, ghost: true } : c)),
      ...copies,
    ],
    feature: parent,
    note: `rebase COPIED ${unique.map((c) => c.id).join(',')} as ${copies.map((c) => c.id).join(',')} — the old ones still exist, orphaned; anyone who had them is now on rewritten history.`,
    tone: 'warn',
  }
}

const btn =
  'rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft'

export default function GitBranchPlayground() {
  const [r, setRepo] = useState<Repo>(initial)

  const mainAnc = ancestors(r.commits, r.main)
  let canMerge = false
  let canRebase = false
  if (r.feature !== null) {
    const featAnc = ancestors(r.commits, r.feature)
    const uniqueCount = r.commits.filter((c) => featAnc.has(c.id) && !mainAnc.has(c.id)).length
    canMerge = !mainAnc.has(r.feature) && (featAnc.has(r.main) || r.commits.length < CAP)
    canRebase = uniqueCount > 0 && !featAnc.has(r.main) && r.commits.length + uniqueCount <= CAP
  }
  const canCommit = r.commits.length < CAP
  const canBranch = r.feature === null
  const canSwitch = r.feature !== null

  const pos = new Map<string, { x: number; y: number }>()
  r.commits.forEach((c, i) => pos.set(c.id, { x: X0 + i * COL_W, y: LANE_Y[c.lane] }))

  const featureLaneVisible = r.feature !== null || r.commits.some((c) => c.lane === 'feature')
  const hasGhosts = r.commits.some((c) => c.ghost)

  const chip = (name: Lane, tipId: string, color: string) => {
    const p = pos.get(tipId)!
    const below = name === 'feature'
    const cy = below ? p.y + 34 : p.y - 34
    const w = name === 'main' ? 46 : 60
    const isHead = r.head === name
    return (
      <g>
        <line
          x1={p.x}
          y1={below ? p.y + R + 2 : p.y - R - 2}
          x2={p.x}
          y2={below ? cy - 9 : cy + 9}
          stroke={color}
          strokeWidth={1}
          opacity={0.6}
        />
        <rect x={p.x - w / 2} y={cy - 9} width={w} height={18} rx={9} fill={color} />
        <text x={p.x} y={cy + 3.5} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill="#FFFFFF">
          {name}
        </text>
        {isHead && (
          <text
            x={p.x}
            y={below ? cy + 23 : cy - 15}
            textAnchor="middle"
            fontSize={10}
            fontWeight={600}
            fontFamily="JetBrains Mono, monospace"
            fill="#17191E"
          >
            {below ? 'HEAD ▴' : 'HEAD ▾'}
          </text>
        )}
      </g>
    )
  }

  return (
    <InteractiveShell
      title="Branches are just pointers"
      notice="Merge ties histories together with a knot; rebase rewrites yours into a straight line — the ghost commits are exactly why you never rebase a branch someone else has pulled."
      onReset={() => setRepo(initial())}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button className={btn} disabled={!canCommit} onClick={() => setRepo(doCommit)}>
          commit
        </button>
        <button className={btn} disabled={!canBranch} onClick={() => setRepo(doBranch)}>
          branch feature
        </button>
        <button className={btn} disabled={!canSwitch} onClick={() => setRepo(doSwitch)}>
          {r.feature === null ? 'switch branch' : `switch to ${r.head === 'main' ? 'feature' : 'main'}`}
        </button>
        <button className={btn} disabled={!canMerge} onClick={() => setRepo(doMerge)}>
          merge feature → main
        </button>
        <button className={btn} disabled={!canRebase} onClick={() => setRepo(doRebase)}>
          rebase feature onto main
        </button>
      </div>

      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        <defs>
          <marker id="gbp-arrow" viewBox="0 0 8 8" refX={6} refY={4} markerWidth={6} markerHeight={6} orient="auto">
            <path d="M0,0L8,4L0,8Z" fill={CHART_AXIS} />
          </marker>
        </defs>

        {/* lane guides */}
        <line x1={16} y1={LANE_Y.main} x2={584} y2={LANE_Y.main} stroke={CHART_GRID} />
        {featureLaneVisible && <line x1={16} y1={LANE_Y.feature} x2={584} y2={LANE_Y.feature} stroke={CHART_GRID} />}

        {/* parent arrows (child → parent, like git) */}
        {r.commits.map((c) =>
          c.parents.map((pid) => {
            const a = pos.get(c.id)!
            const b = pos.get(pid)!
            const dx = b.x - a.x
            const dy = b.y - a.y
            const len = Math.hypot(dx, dy)
            const ux = dx / len
            const uy = dy / len
            return (
              <line
                key={`${c.id}-${pid}`}
                x1={a.x + ux * R}
                y1={a.y + uy * R}
                x2={b.x - ux * (R + 5)}
                y2={b.y - uy * (R + 5)}
                stroke={CHART_AXIS}
                strokeWidth={1.5}
                strokeDasharray={c.ghost ? '3 3' : undefined}
                opacity={c.ghost ? 0.35 : 0.8}
                markerEnd="url(#gbp-arrow)"
              />
            )
          }),
        )}

        {/* commits */}
        {r.commits.map((c) => {
          const p = pos.get(c.id)!
          const color = c.lane === 'main' ? MAIN : FEAT
          return (
            <g key={c.id} opacity={c.ghost ? 0.45 : 1}>
              <circle
                cx={p.x}
                cy={p.y}
                r={R}
                fill="#FFFFFF"
                stroke={c.ghost ? CHART_AXIS : color}
                strokeWidth={2}
                strokeDasharray={c.ghost ? '3 3' : undefined}
              />
              <text
                x={p.x}
                y={p.y + 3.5}
                textAnchor="middle"
                fontSize={9.5}
                fontFamily="JetBrains Mono, monospace"
                fill={c.ghost ? CHART_AXIS : '#17191E'}
              >
                {c.id}
              </text>
            </g>
          )
        })}

        {/* branch tip chips + HEAD */}
        {chip('main', r.main, MAIN)}
        {r.feature !== null && chip('feature', r.feature, FEAT)}

        <text x={584} y={16} textAnchor="end" fontSize={10.5} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
          commits: {r.commits.length}/{CAP}
        </text>
        {hasGhosts && (
          <text x={16} y={292} fontSize={10.5} fill={CHART_AXIS}>
            dashed = orphaned by rebase — still in .git, just unreachable
          </text>
        )}
      </svg>

      <p className={`mt-2 min-h-12 font-mono text-[13px] ${r.tone === 'good' ? 'text-correct' : r.tone === 'warn' ? 'text-wrong' : 'text-ink'}`}>
        {r.note}
      </p>
    </InteractiveShell>
  )
}
