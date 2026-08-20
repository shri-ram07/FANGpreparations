import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

type Algo = 'bfs' | 'dfs' | 'dijkstra'

const NODES: Record<string, { x: number; y: number }> = {
  A: { x: 70, y: 70 },
  B: { x: 220, y: 45 },
  C: { x: 390, y: 60 },
  D: { x: 540, y: 110 },
  E: { x: 100, y: 220 },
  F: { x: 260, y: 180 },
  G: { x: 410, y: 250 },
  H: { x: 540, y: 230 },
}
const IDS = Object.keys(NODES)

// [u, v, weight] — undirected
const EDGES: [string, string, number][] = [
  ['A', 'B', 4],
  ['A', 'E', 2],
  ['A', 'F', 7],
  ['B', 'C', 3],
  ['B', 'F', 1],
  ['C', 'D', 5],
  ['C', 'F', 6],
  ['C', 'G', 8],
  ['D', 'H', 2],
  ['E', 'F', 3],
  ['F', 'G', 4],
  ['G', 'H', 1],
]

const LABELS: Record<Algo, string> = {
  bfs: 'queue (FIFO)',
  dfs: 'stack (LIFO)',
  dijkstra: 'min-heap by distance',
}

interface Frame {
  current: string | null
  visited: string[]
  frontier: string[]
  dist?: Record<string, number>
  note: string
}

function simulate(algo: Algo, start: string, disabled: number[]): Frame[] {
  const adj = new Map<string, [string, number][]>()
  for (const id of IDS) adj.set(id, [])
  EDGES.forEach(([u, v, w], i) => {
    if (disabled.includes(i)) return
    adj.get(u)!.push([v, w])
    adj.get(v)!.push([u, w])
  })
  for (const id of IDS) adj.get(id)!.sort((a, b) => a[0].localeCompare(b[0]))

  const frames: Frame[] = []
  const visited: string[] = []

  if (algo === 'dijkstra') {
    const dist: Record<string, number> = { [start]: 0 }
    const frontier: string[] = [start]
    frames.push({ current: null, visited: [], frontier: [start], dist: { ...dist }, note: `Start at ${start} — dist 0, everything else ∞.` })
    while (frontier.length > 0) {
      const u = frontier.shift()!
      visited.push(u)
      const relaxed: string[] = []
      for (const [v, w] of adj.get(u)!) {
        if (visited.includes(v)) continue
        const nd = dist[u]! + w
        if (dist[v] === undefined || nd < dist[v]!) {
          dist[v] = nd
          if (!frontier.includes(v)) frontier.push(v)
          relaxed.push(`${v}→${nd}`)
        }
      }
      frontier.sort((a, b) => dist[a]! - dist[b]! || a.localeCompare(b))
      frames.push({
        current: u,
        visited: [...visited],
        frontier: [...frontier],
        dist: { ...dist },
        note: `pop ${u} (dist ${dist[u]}) — cheapest in the heap.${relaxed.length > 0 ? ` Relax ${relaxed.join(', ')}.` : ' Nothing to relax.'}`,
      })
    }
    frames.push({
      current: null,
      visited: [...visited],
      frontier: [],
      dist: { ...dist },
      note: `Heap empty — shortest distances settled for ${visited.length}/${IDS.length} nodes${visited.length < IDS.length ? ', the rest are cut off' : ''}.`,
    })
    return frames
  }

  const frontier: string[] = [start]
  frames.push({ current: null, visited: [], frontier: [start], note: `Start at ${start} — ${algo === 'bfs' ? 'enqueue it' : 'push it'}.` })
  while (frontier.length > 0) {
    const u = algo === 'bfs' ? frontier.shift()! : frontier.pop()!
    visited.push(u)
    // ponytail: skip nodes already waiting in the container instead of stacking
    // duplicates — cleaner chips; switch to classic duplicate-push if fidelity matters
    const added = adj.get(u)!.map(([v]) => v).filter((v) => !visited.includes(v) && !frontier.includes(v))
    const pushed = algo === 'dfs' ? [...added].reverse() : added
    frontier.push(...pushed)
    frames.push({
      current: u,
      visited: [...visited],
      frontier: [...frontier],
      note:
        algo === 'bfs'
          ? `dequeue ${u} → visit.${pushed.length > 0 ? ` Enqueue ${pushed.join(', ')}.` : ' Nothing new to enqueue.'}`
          : `pop ${u} → visit.${pushed.length > 0 ? ` Push ${pushed.join(', ')}.` : ' Nothing new to push.'}`,
    })
  }
  frames.push({
    current: null,
    visited: [...visited],
    frontier: [],
    note: `${algo === 'bfs' ? 'Queue' : 'Stack'} empty — ${visited.length}/${IDS.length} nodes reached${visited.length < IDS.length ? ', the rest are cut off by disabled edges' : ''}.`,
  })
  return frames
}

export default function GraphTraversal({ algorithm = 'bfs' }: { algorithm?: Algo }) {
  const [algo, setAlgo] = useState<Algo>(algorithm)
  const [start, setStart] = useState('A')
  const [disabled, setDisabled] = useState<number[]>([])

  const frames = useMemo(() => simulate(algo, start, disabled), [algo, start, disabled])
  const stepper = useStepper(frames.length)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algo, start, disabled])

  const f = frames[stepper.step]!

  const toggleEdge = (i: number) =>
    setDisabled((d) => (d.includes(i) ? d.filter((x) => x !== i) : [...d, i]))

  return (
    <InteractiveShell
      title="Three traversals, one graph"
      notice="BFS eats the graph in rings, DFS dives to the bottom first, Dijkstra always pops the cheapest — watch the container, it IS the algorithm."
      onReset={() => {
        setAlgo(algorithm)
        setStart('A')
        setDisabled([])
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {(['bfs', 'dfs', 'dijkstra'] as Algo[]).map((a) => (
          <button
            key={a}
            onClick={() => setAlgo(a)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              a === algo ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {a.toUpperCase()}
          </button>
        ))}
        <span className="ml-auto text-xs text-ink-soft">click a node = start · click an edge = disable</span>
      </div>

      <svg viewBox="0 0 600 300" className="h-auto w-full select-none">
        {EDGES.map(([u, v, w], i) => {
          const a = NODES[u]!
          const b = NODES[v]!
          const off = disabled.includes(i)
          return (
            <g key={i} className="cursor-pointer" onClick={() => toggleEdge(i)}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={off ? '#E4E6E1' : '#B9BDB4'}
                strokeWidth={off ? 1.5 : 2}
                strokeDasharray={off ? '5 4' : undefined}
              />
              {algo === 'dijkstra' && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 + 3.5}
                  textAnchor="middle"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  fill={off ? '#C9CCC3' : CHART_AXIS}
                  stroke="#FFFFFF"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {w}
                </text>
              )}
              {/* fat invisible hitbox so edges are clickable */}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="transparent" strokeWidth={14} pointerEvents="stroke" />
            </g>
          )
        })}
        {IDS.map((id) => {
          const p = NODES[id]!
          const isCur = f.current === id
          const isVisited = f.visited.includes(id)
          const inFrontier = f.frontier.includes(id)
          const fill = isCur ? '#2450E5' : isVisited ? '#178A50' : '#FFFFFF'
          return (
            <g key={id} className="cursor-pointer" onClick={() => setStart(id)}>
              <circle
                cx={p.x}
                cy={p.y}
                r={16}
                fill={fill}
                stroke={isCur || isVisited ? 'none' : inFrontier ? '#F5A300' : '#E4E6E1'}
                strokeWidth={inFrontier ? 2.5 : 1.5}
              />
              <text
                x={p.x}
                y={p.y + 4.5}
                textAnchor="middle"
                fontSize={13}
                fontFamily="JetBrains Mono, monospace"
                fill={fill === '#FFFFFF' ? '#17191E' : '#FFFFFF'}
              >
                {id}
              </text>
              {id === start && (
                <text x={p.x} y={p.y - 23} textAnchor="middle" fontSize={9.5} fill={CHART_AXIS}>
                  start
                </text>
              )}
              {algo === 'dijkstra' && (
                <text x={p.x} y={p.y + 31} textAnchor="middle" fontSize={10} fontFamily="JetBrains Mono, monospace" fill={CHART_AXIS}>
                  {f.dist?.[id] ?? '∞'}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-xs text-ink-soft">{LABELS[algo]}:</span>
        {f.frontier.length === 0 ? (
          <span className="text-xs text-ink-soft">empty</span>
        ) : (
          f.frontier.map((id, i) => {
            const nextOut = algo === 'dfs' ? i === f.frontier.length - 1 : i === 0
            return (
              <span
                key={id}
                className={`rounded-full border px-2.5 py-0.5 font-mono text-xs text-ink ${nextOut ? '' : 'border-line'}`}
                style={nextOut ? { borderColor: '#F5A300' } : undefined}
              >
                {algo === 'dijkstra' ? `${id}:${f.dist?.[id]}` : id}
              </span>
            )
          })
        )}
        {f.frontier.length > 0 && <span className="text-[10px] text-ink-soft">(gold ring = next out)</span>}
      </div>

      <p className="my-2 min-h-10 font-mono text-[13px] text-ink">{f.note}</p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
