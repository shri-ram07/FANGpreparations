import { useEffect, useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS } from './shell/colors'

type Model = 'knn' | 'logistic' | 'tree'

interface Pt {
  x: number
  y: number
  cls: 0 | 1
}

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeData(): Pt[] {
  const rand = mulberry32(42)
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand())
  const clamp = (v: number) => Math.min(0.97, Math.max(0.03, v))
  const blob = (cx: number, cy: number, sd: number, n: number, cls: 0 | 1) => {
    const pts: Pt[] = []
    for (let i = 0; i < n; i++) pts.push({ x: clamp(cx + gauss() * sd), y: clamp(cy + gauss() * sd), cls })
    return pts
  }
  return [
    ...blob(0.34, 0.64, 0.13, 27, 0),
    ...blob(0.64, 0.36, 0.13, 27, 1),
    // stragglers deep in enemy territory — the noise points k=1 memorizes
    ...blob(0.72, 0.28, 0.05, 3, 0),
    ...blob(0.26, 0.72, 0.05, 3, 1),
  ]
}

const POINTS = makeData()
const CLASS_COLORS = ['#2450E5', '#B45309'] as const
const REGION_FILLS = ['rgba(36,80,229,0.18)', 'rgba(180,83,9,0.18)'] as const
const W = 600
const H = 340
const GRID_W = 130
const GRID_H = 74

function knnPredict(k: number, x: number, y: number): 0 | 1 {
  const d = POINTS.map((p) => ({ d2: (p.x - x) ** 2 + (p.y - y) ** 2, cls: p.cls }))
  d.sort((a, b) => a.d2 - b.d2)
  let ones = 0
  for (let i = 0; i < k; i++) ones += d[i]!.cls
  return ones * 2 > k ? 1 : 0
}

function trainLogistic(): [number, number, number] {
  let w1 = 0
  let w2 = 0
  let b = 0
  const lr = 4
  for (let step = 0; step < 300; step++) {
    let g1 = 0
    let g2 = 0
    let gb = 0
    for (const p of POINTS) {
      const err = 1 / (1 + Math.exp(-(w1 * p.x + w2 * p.y + b))) - p.cls
      g1 += err * p.x
      g2 += err * p.y
      gb += err
    }
    w1 -= (lr * g1) / POINTS.length
    w2 -= (lr * g2) / POINTS.length
    b -= (lr * gb) / POINTS.length
  }
  return [w1, w2, b]
}

interface TreeNode {
  cls: 0 | 1
  feat?: 0 | 1
  thr?: number
  left?: TreeNode
  right?: TreeNode
}

function buildTree(pts: Pt[], depth: number): TreeNode {
  const ones = pts.reduce<number>((s, p) => s + p.cls, 0)
  const cls: 0 | 1 = ones * 2 > pts.length ? 1 : 0
  if (depth === 0 || ones === 0 || ones === pts.length) return { cls }
  const gini = (o: number, n: number) => (n === 0 ? 0 : 1 - (o / n) ** 2 - (1 - o / n) ** 2)
  let best: { feat: 0 | 1; thr: number; score: number } | null = null
  for (const feat of [0, 1] as const) {
    const vals = [...new Set(pts.map((p) => (feat === 0 ? p.x : p.y)))].sort((a, b) => a - b)
    for (let i = 1; i < vals.length; i++) {
      const thr = (vals[i - 1]! + vals[i]!) / 2
      let nl = 0
      let ol = 0
      for (const p of pts) {
        if ((feat === 0 ? p.x : p.y) < thr) {
          nl++
          ol += p.cls
        }
      }
      const nr = pts.length - nl
      const score = (nl * gini(ol, nl) + nr * gini(ones - ol, nr)) / pts.length
      if (best === null || score < best.score) best = { feat, thr, score }
    }
  }
  if (best === null) return { cls }
  const b = best
  const left = pts.filter((p) => (b.feat === 0 ? p.x : p.y) < b.thr)
  const right = pts.filter((p) => (b.feat === 0 ? p.x : p.y) >= b.thr)
  if (left.length === 0 || right.length === 0) return { cls }
  return { cls, feat: b.feat, thr: b.thr, left: buildTree(left, depth - 1), right: buildTree(right, depth - 1) }
}

function treePredict(root: TreeNode, x: number, y: number): 0 | 1 {
  let n = root
  while (n.left && n.right && n.feat !== undefined && n.thr !== undefined) {
    n = (n.feat === 0 ? x : y) < n.thr ? n.left : n.right
  }
  return n.cls
}

const MODELS: { key: Model; label: string }[] = [
  { key: 'knn', label: 'k-NN' },
  { key: 'logistic', label: 'Logistic' },
  { key: 'tree', label: 'Tree' },
]

export default function DecisionBoundaryPlayground({ model = 'knn' }: { model?: Model }) {
  const [active, setActive] = useState<Model>(model)
  const [k, setK] = useState(5)
  const [depth, setDepth] = useState(3)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const predict = useMemo<(x: number, y: number) => 0 | 1>(() => {
    if (active === 'knn') return (x, y) => knnPredict(k, x, y)
    if (active === 'logistic') {
      const [w1, w2, b] = trainLogistic()
      return (x, y) => (w1 * x + w2 * y + b > 0 ? 1 : 0)
    }
    const root = buildTree(POINTS, depth)
    return (x, y) => treePredict(root, x, y)
  }, [active, k, depth])

  const grid = useMemo(() => {
    const g = new Uint8Array(GRID_W * GRID_H)
    for (let gy = 0; gy < GRID_H; gy++) {
      const y = 1 - (gy + 0.5) / GRID_H
      for (let gx = 0; gx < GRID_W; gx++) {
        g[gy * GRID_W + gx] = predict((gx + 0.5) / GRID_W, y)
      }
    }
    return g
  }, [predict])

  const accuracy = useMemo(() => {
    let hit = 0
    for (const p of POINTS) if (predict(p.x, p.y) === p.cls) hit++
    return hit
  }, [predict])

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)
    const cw = W / GRID_W
    const ch = H / GRID_H
    for (let gy = 0; gy < GRID_H; gy++) {
      for (let gx = 0; gx < GRID_W; gx++) {
        ctx.fillStyle = REGION_FILLS[grid[gy * GRID_W + gx]!]!
        ctx.fillRect(gx * cw, gy * ch, cw + 0.5, ch + 0.5)
      }
    }
  }, [grid])

  return (
    <InteractiveShell
      title="Three models, one dataset"
      notice="k=1 memorizes every noise point as its own island; k=15 smooths them away — the dial IS the bias-variance tradeoff."
      onReset={() => {
        setActive(model)
        setK(5)
        setDepth(3)
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Model:</span>
        {MODELS.map((m) => (
          <button
            key={m.key}
            onClick={() => setActive(m.key)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              m.key === active ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 h-full w-full" style={{ width: '100%' }} />
        <svg viewBox={`0 0 ${W} ${H}`} className="relative h-auto w-full select-none">
          {POINTS.map((p, i) => (
            <circle key={i} cx={p.x * W} cy={(1 - p.y) * H} r={4} fill={CLASS_COLORS[p.cls]} stroke="#FFFFFF" strokeWidth={2} />
          ))}
          <circle cx={14} cy={16} r={4} fill={CLASS_COLORS[0]} stroke="#FFFFFF" strokeWidth={2} />
          <text x={24} y={20} fontSize={10.5} fill={CHART_AXIS}>
            class A
          </text>
          <circle cx={W - 74} cy={16} r={4} fill={CLASS_COLORS[1]} stroke="#FFFFFF" strokeWidth={2} />
          <text x={W - 64} y={20} fontSize={10.5} fill={CHART_AXIS}>
            class B
          </text>
        </svg>
      </div>

      {active === 'knn' && (
        <div className="mt-3 flex items-center gap-3">
          <span className="shrink-0 font-mono text-xs text-ink-soft">k (neighbors)</span>
          <input type="range" min={1} max={15} step={2} value={k} onChange={(e) => setK(Number(e.target.value))} className="w-full accent-accent" />
          <span className="w-10 text-right font-mono text-sm">{k}</span>
        </div>
      )}
      {active === 'tree' && (
        <div className="mt-3 flex items-center gap-3">
          <span className="shrink-0 font-mono text-xs text-ink-soft">max depth</span>
          <input type="range" min={1} max={6} step={1} value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="w-full accent-accent" />
          <span className="w-10 text-right font-mono text-sm">{depth}</span>
        </div>
      )}
      {active === 'logistic' && (
        <p className="mt-3 text-xs text-ink-soft">trained with 300 gradient-descent steps — the boundary is a straight line, no dial can bend it</p>
      )}

      <div className="mt-2 font-mono text-xs text-ink-soft">
        train accuracy: {((100 * accuracy) / POINTS.length).toFixed(1)}% ({accuracy}/{POINTS.length})
      </div>
    </InteractiveShell>
  )
}
