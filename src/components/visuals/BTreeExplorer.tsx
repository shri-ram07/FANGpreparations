import { useEffect, useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'
import { CHART_AXIS } from './shell/colors'

interface TreeNode {
  id: number
  leaf: boolean
  keys: number[]
  children: TreeNode[]
}

interface Frame {
  root: TreeNode | null
  splitIds: number[]
  note: string
}

// Chosen to trigger several leaf splits, internal splits and two root growths.
const SEQ = [18, 7, 42, 3, 29, 55, 12, 88, 35, 61, 24, 9, 73, 47, 16, 91, 5, 38]

const KEY_W = 26
const NODE_H = 30
const H_GAP = 14
const V_GAP = 42

function cloneTree(n: TreeNode): TreeNode {
  return { ...n, keys: [...n.keys], children: n.children.map(cloneTree) }
}

function treeHeight(root: TreeNode): number {
  let h = 1
  let n = root
  while (!n.leaf) {
    h++
    n = n.children[0]!
  }
  return h
}

// Order 4: max 3 keys, split on 4. B+ semantics: leaves hold the data keys,
// leaf splits COPY the separator up, internal splits PUSH the middle key up.
function insertKey(root: TreeNode, key: number, splitIds: number[], events: string[]): TreeNode {
  const rec = (n: TreeNode): { up: number; right: TreeNode } | null => {
    if (n.leaf) {
      const i = n.keys.findIndex((k) => key < k)
      n.keys.splice(i === -1 ? n.keys.length : i, 0, key)
      if (n.keys.length <= 3) return null
      const right: TreeNode = { id: -1, leaf: true, keys: n.keys.splice(2), children: [] }
      splitIds.push(n.id)
      events.push(`leaf overflows → split, copy ${right.keys[0]} up`)
      return { up: right.keys[0]!, right }
    }
    let ci = n.keys.findIndex((k) => key < k)
    if (ci === -1) ci = n.keys.length
    const r = rec(n.children[ci]!)
    if (r === null) return null
    n.keys.splice(ci, 0, r.up)
    n.children.splice(ci + 1, 0, r.right)
    if (n.keys.length <= 3) return null
    const up = n.keys[2]!
    const right: TreeNode = { id: -1, leaf: false, keys: n.keys.splice(3), children: n.children.splice(3) }
    n.keys.pop() // drop the promoted key from the left half
    splitIds.push(n.id)
    events.push(`internal node overflows → split, push ${up} up`)
    return { up, right }
  }
  const r = rec(root)
  if (r === null) return root
  const newRoot: TreeNode = { id: -1, leaf: false, keys: [r.up], children: [root, r.right] }
  events.push(`split reaches the top — new root [${r.up}], height now ${treeHeight(newRoot)}`)
  return newRoot
}

function simulate(keys: number[]): Frame[] {
  let nextId = 0
  const frames: Frame[] = [{ root: null, splitIds: [], note: 'Empty tree — insert a key to start.' }]
  let root: TreeNode | null = null
  for (const k of keys) {
    const splitIds: number[] = []
    const events: string[] = []
    if (root === null) {
      root = { id: nextId++, leaf: true, keys: [k], children: [] }
    } else {
      root = insertKey(root, k, splitIds, events)
      // assign fresh ids to nodes created by this insert (id -1 markers)
      const fix = (n: TreeNode) => {
        if (n.id === -1) {
          n.id = nextId++
          splitIds.push(n.id)
        }
        n.children.forEach(fix)
      }
      fix(root)
    }
    const note = events.length > 0 ? `insert ${k} — ${events.join('; ')}` : `insert ${k} into its leaf — fits, no split`
    frames.push({ root: cloneTree(root), splitIds, note })
  }
  return frames
}

interface Box {
  n: TreeNode
  x: number
  y: number
  w: number
}

// ponytail: subW is recomputed along the recursion, O(n·depth) — fine at teaching sizes
function layout(root: TreeNode): { boxes: Box[]; totalW: number; depth: number } {
  const boxes: Box[] = []
  const nodeW = (n: TreeNode) => Math.max(n.keys.length, 1) * KEY_W + 10
  const subW = (n: TreeNode): number =>
    n.leaf
      ? nodeW(n)
      : Math.max(nodeW(n), n.children.reduce((s, c) => s + subW(c), 0) + H_GAP * (n.children.length - 1))
  let depth = 0
  const place = (n: TreeNode, x: number, d: number): number => {
    depth = Math.max(depth, d)
    const w = nodeW(n)
    const y = d * (NODE_H + V_GAP)
    if (n.leaf) {
      boxes.push({ n, x: x + (subW(n) - w) / 2, y, w })
      return x + subW(n) / 2
    }
    const kidsW = n.children.reduce((s, c) => s + subW(c), 0) + H_GAP * (n.children.length - 1)
    let cx = x + (subW(n) - kidsW) / 2
    const centers = n.children.map((c) => {
      const center = place(c, cx, d + 1)
      cx += subW(c) + H_GAP
      return center
    })
    const mid = (centers[0]! + centers[centers.length - 1]!) / 2
    boxes.push({ n, x: mid - w / 2, y, w })
    return mid
  }
  place(root, 0, 0)
  return { boxes, totalW: subW(root), depth }
}

const btn =
  'rounded-md border border-line px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft'

export default function BTreeExplorer() {
  const [keys, setKeys] = useState<number[]>([])
  const [custom, setCustom] = useState('')
  const [reject, setReject] = useState<string | null>(null)

  const frames = useMemo(() => simulate(keys), [keys])
  const stepper = useStepper(frames.length)
  const { seek, reset } = stepper

  // new insert regenerates frames — jump to the newest tree
  useEffect(() => {
    seek(keys.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.length])

  const nextSeq = SEQ.find((k) => !keys.includes(k))

  const insertCustom = () => {
    const v = Number(custom)
    if (!Number.isInteger(v) || v < 1 || v > 999) {
      setReject('enter an integer between 1 and 999')
      return
    }
    if (keys.includes(v)) {
      setReject(`${v} is already in the tree — duplicates rejected, index keys are unique`)
      return
    }
    setReject(null)
    setCustom('')
    setKeys((ks) => [...ks, v])
  }

  const f = frames[stepper.step]!
  const splitSet = new Set(f.splitIds)

  let svgH = 64
  let boxes: Box[] = []
  let scale = 1
  let tx = 0
  let height = 0
  let nodeCount = 0
  if (f.root !== null) {
    const l = layout(f.root)
    boxes = l.boxes
    scale = Math.min(1, 570 / l.totalW)
    tx = (600 - l.totalW * scale) / 2
    svgH = 8 + (l.depth * (NODE_H + V_GAP) + NODE_H) * scale + 24
    height = l.depth + 1
    const count = (n: TreeNode): number => 1 + n.children.reduce((s, c) => s + count(c), 0)
    nodeCount = count(f.root)
  }
  const pos = new Map(boxes.map((b) => [b.n.id, b]))
  const leaves = boxes.filter((b) => b.n.leaf).sort((a, b) => a.x - b.x)

  return (
    <InteractiveShell
      title="How a B+ tree grows"
      notice="Watch a split bubble upward — B+ trees grow from the LEAVES to the root, which is why they stay balanced for free and every lookup costs the same log(n) hops."
      onReset={() => {
        setKeys([])
        setCustom('')
        setReject(null)
        reset()
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button className={btn} onClick={() => nextSeq !== undefined && setKeys((ks) => [...ks, nextSeq])} disabled={nextSeq === undefined}>
          {nextSeq !== undefined ? (
            <>
              Insert next <span className="font-mono">({nextSeq})</span>
            </>
          ) : (
            'Sequence done'
          )}
        </button>
        <input
          type="number"
          min={1}
          max={999}
          placeholder="key"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && insertCustom()}
          className="w-20 rounded-md border border-line px-2 py-1 font-mono text-xs"
          aria-label="Custom key"
        />
        <button className={btn} onClick={insertCustom}>
          Insert
        </button>
        {reject !== null && <span className="text-xs text-wrong">{reject}</span>}
      </div>

      <svg viewBox={`0 0 600 ${svgH}`} className="h-auto w-full select-none">
        <defs>
          <marker id="btree-chain-arrow" viewBox="0 0 6 6" refX={5} refY={3} markerWidth={5} markerHeight={5} orient="auto">
            <path d="M0,0L6,3L0,6Z" fill="rgba(36,80,229,0.5)" />
          </marker>
        </defs>
        {f.root === null ? (
          <text x={300} y={36} textAnchor="middle" fontSize={11} fill={CHART_AXIS}>
            empty tree — press “Insert next” and watch it grow
          </text>
        ) : (
          <>
            <g transform={`translate(${tx},8) scale(${scale})`}>
              {/* parent links, anchored at the child-pointer slot between keys */}
              {boxes.map((b) =>
                b.n.children.map((c, i) => {
                  const cb = pos.get(c.id)!
                  return (
                    <line
                      key={`${b.n.id}-${c.id}`}
                      x1={b.x + 5 + i * KEY_W}
                      y1={b.y + NODE_H}
                      x2={cb.x + cb.w / 2}
                      y2={cb.y}
                      stroke="#C9CCC3"
                      strokeWidth={1}
                    />
                  )
                }),
              )}
              {/* B+ leaf chain: leaves in layout order ARE the linked list */}
              {leaves.slice(0, -1).map((l, i) => {
                const r = leaves[i + 1]!
                return (
                  <line
                    key={`chain-${l.n.id}`}
                    x1={l.x + l.w + 2}
                    y1={l.y + NODE_H / 2}
                    x2={r.x - 3}
                    y2={r.y + NODE_H / 2}
                    stroke="rgba(36,80,229,0.5)"
                    strokeWidth={1.5}
                    markerEnd="url(#btree-chain-arrow)"
                  />
                )
              })}
              {boxes.map((b) => (
                <g key={b.n.id}>
                  <rect
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={NODE_H}
                    rx={6}
                    fill={b.n.leaf ? '#FFFFFF' : '#F6F7F4'}
                    stroke={splitSet.has(b.n.id) ? '#F5A300' : '#E4E6E1'}
                    strokeWidth={splitSet.has(b.n.id) ? 2 : 1}
                  />
                  {b.n.keys.map((k, j) => (
                    <text
                      key={j}
                      x={b.x + 5 + j * KEY_W + KEY_W / 2}
                      y={b.y + 20}
                      textAnchor="middle"
                      fontSize={12.5}
                      fontFamily="JetBrains Mono, monospace"
                      fill="#17191E"
                    >
                      {k}
                    </text>
                  ))}
                  {b.n.keys.slice(1).map((_, j) => (
                    <line
                      key={`s${j}`}
                      x1={b.x + 5 + (j + 1) * KEY_W}
                      y1={b.y + 6}
                      x2={b.x + 5 + (j + 1) * KEY_W}
                      y2={b.y + NODE_H - 6}
                      stroke="#E4E6E1"
                    />
                  ))}
                </g>
              ))}
            </g>
            <text x={tx} y={svgH - 6} fontSize={10} fill={CHART_AXIS}>
              internal = routing keys · leaves = data, chained left→right
            </text>
          </>
        )}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-xs text-ink-soft">
        <span>keys {stepper.step}</span>
        <span>height {height}</span>
        <span>nodes {nodeCount}</span>
        {f.root !== null && <span className="text-correct">every leaf at depth {height} ✓</span>}
      </div>
      <p className="mt-1 text-[13px] text-ink-soft">
        THIS is your database index — 3 hops to any of a million rows.
      </p>

      <p className="my-2 min-h-10 font-mono text-[13px] text-ink">{f.note}</p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
