import { useMemo, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { CHART_AXIS, CHART_SERIES } from './shell/colors'

// FNV-1a — deterministic, decent spread on short strings
const hashInt = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
const hashAngle = (s: string): number => (hashInt(s) % 3600) / 10

const KEYS = Array.from({ length: 12 }, (_, i) => `k${i + 1}`)
const KEY_ANGLES = KEYS.map((k) => hashAngle(k))

interface RingPt {
  angle: number
  server: string
}

const ringPoints = (servers: string[], vnodes: boolean): RingPt[] =>
  servers
    .flatMap((s) =>
      vnodes
        ? [0, 1, 2].map((i) => ({ angle: hashAngle(`${s}#${i}`), server: s }))
        : [{ angle: hashAngle(`srv-${s}`), server: s }],
    )
    .sort((a, b) => a.angle - b.angle)

// owner = next ring point clockwise (angles measured clockwise from 12 o'clock)
const ownerPt = (keyAngle: number, pts: RingPt[]): RingPt => pts.find((p) => p.angle >= keyAngle) ?? pts[0]!

const colorOf = (letter: string): string => CHART_SERIES[(letter.charCodeAt(0) - 65) % CHART_SERIES.length]!

const CX = 300
const CY = 150
const R = 104
const RK = 80
const xy = (deg: number, rad: number) => {
  const t = (deg * Math.PI) / 180
  return { x: CX + rad * Math.sin(t), y: CY - rad * Math.cos(t) }
}

const INITIAL = ['A', 'B', 'C']

export default function ConsistentHashRing() {
  const [servers, setServers] = useState<string[]>(INITIAL)
  const [nextIdx, setNextIdx] = useState(INITIAL.length)
  const [vnodes, setVnodes] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ moved: Set<string>; naive: number } | null>(null)

  const pts = useMemo(() => ringPoints(servers, vnodes), [servers, vnodes])
  const owners = useMemo(() => KEYS.map((_, i) => ownerPt(KEY_ANGLES[i]!, pts)), [pts])

  // keys-per-server balance, both modes, for the comparison bars
  const counts = useMemo(() => {
    const tally = (v: boolean) => {
      const p = ringPoints(servers, v)
      const c = new Map<string, number>(servers.map((s) => [s, 0]))
      for (const a of KEY_ANGLES) c.set(ownerPt(a, p).server, c.get(ownerPt(a, p).server)! + 1)
      return c
    }
    return { plain: tally(false), vn: tally(true) }
  }, [servers])

  const commitTopology = (next: string[]) => {
    const prevPts = pts
    const nextPts = ringPoints(next, vnodes)
    const moved = new Set(KEYS.filter((_, i) => ownerPt(KEY_ANGLES[i]!, prevPts).server !== ownerPt(KEY_ANGLES[i]!, nextPts).server))
    // naive mod-N against the real previous list: owner = servers[hash(key) mod N]
    const naive = KEYS.filter((k) => servers[hashInt(k) % servers.length] !== next[hashInt(k) % next.length]).length
    setLastMove({ moved, naive })
    setServers(next)
    setSelected(null)
  }

  const addServer = () => {
    commitTopology([...servers, String.fromCharCode(65 + nextIdx)])
    setNextIdx(nextIdx + 1)
  }
  const removeServer = () => {
    if (selected === null) return
    commitTopology(servers.filter((s) => s !== selected))
  }

  const pct = (n: number) => Math.round((n / KEYS.length) * 100)

  const barX = 130
  const barW = 440
  const bar = (row: Map<string, number>, y: number, label: string, active: boolean) => {
    let x = barX
    return (
      <g key={label}>
        <text x={barX - 8} y={y + 10} textAnchor="end" fontSize={10} fill={active ? '#17191E' : CHART_AXIS}>
          {label}
        </text>
        {servers.map((s) => {
          const w = (row.get(s)! / KEYS.length) * barW
          const seg = (
            <g key={s}>
              <rect x={x} y={y} width={Math.max(w - 1, 0)} height={13} fill={colorOf(s)} opacity={active ? 0.9 : 0.45} />
              {w >= 18 && (
                <text x={x + w / 2} y={y + 10} textAnchor="middle" fontSize={9} fill="#FFFFFF" fontFamily="JetBrains Mono, monospace">
                  {s}·{row.get(s)}
                </text>
              )}
            </g>
          )
          x += w
          return seg
        })}
      </g>
    )
  }

  return (
    <InteractiveShell
      title="Consistent hashing — the ring"
      notice="Adding a server steals only one arc of keys; mod-N reshuffles almost everything — that difference is why every distributed cache uses a ring."
      onReset={() => {
        setServers(INITIAL)
        setNextIdx(INITIAL.length)
        setVnodes(false)
        setSelected(null)
        setLastMove(null)
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button
          onClick={addServer}
          disabled={servers.length >= 8 || nextIdx > 25}
          className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-accent disabled:opacity-40 disabled:hover:border-line"
        >
          + Add server
        </button>
        <button
          onClick={removeServer}
          disabled={selected === null || servers.length <= 1}
          className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-soft hover:border-wrong hover:text-wrong disabled:opacity-40 disabled:hover:border-line disabled:hover:text-ink-soft"
        >
          {selected !== null ? `Remove ${selected}` : 'Remove (click a server)'}
        </button>
        <button
          onClick={() => {
            setVnodes(!vnodes)
            setLastMove(null)
          }}
          className={`rounded-full border px-2.5 py-0.5 text-xs ${
            vnodes ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
          }`}
        >
          virtual nodes ×3
        </button>
      </div>

      <svg viewBox="0 0 600 340" className="h-auto w-full select-none">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#E4E6E1" strokeWidth={1.5} />

        {/* key → owner lines, then key dots (tinted by owner) */}
        {KEYS.map((k, i) => {
          const a = KEY_ANGLES[i]!
          const own = owners[i]!
          const c = colorOf(own.server)
          const kp = xy(a, RK)
          const op = xy(own.angle, R)
          const lp = xy(a, RK - 13)
          const flashed = lastMove !== null && lastMove.moved.has(k)
          return (
            <g key={k}>
              <line x1={kp.x} y1={kp.y} x2={op.x} y2={op.y} stroke={c} strokeWidth={1} opacity={0.3} />
              {flashed && <circle cx={kp.x} cy={kp.y} r={8.5} fill="none" stroke="#F5A300" strokeWidth={2} className="animate-pulse" />}
              <circle cx={kp.x} cy={kp.y} r={4.5} fill={c} fillOpacity={0.6} />
              <text x={lp.x} y={lp.y + 3} textAnchor="middle" fontSize={8.5} fill={CHART_AXIS} fontFamily="JetBrains Mono, monospace">
                {k}
              </text>
            </g>
          )
        })}

        {/* server dots (click to select) */}
        {pts.map((p, i) => {
          const sp = xy(p.angle, R)
          const isSel = p.server === selected
          return (
            <g key={i} onClick={() => setSelected(isSel ? null : p.server)} className="cursor-pointer">
              {isSel && <circle cx={sp.x} cy={sp.y} r={13} fill="none" stroke="#17191E" strokeWidth={1.5} strokeDasharray="3 2" />}
              <circle cx={sp.x} cy={sp.y} r={9} fill={colorOf(p.server)} stroke="#FFFFFF" strokeWidth={1.5} />
              <text x={sp.x} y={sp.y + 3.5} textAnchor="middle" fontSize={10} fontWeight={600} fill="#FFFFFF">
                {p.server}
              </text>
            </g>
          )
        })}

        <text x={CX} y={CY - 4} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          owner = next server
        </text>
        <text x={CX} y={CY + 10} textAnchor="middle" fontSize={10.5} fill={CHART_AXIS}>
          clockwise ↻
        </text>

        {/* balance bars: with and without vnodes */}
        <text x={barX - 8} y={276} textAnchor="end" fontSize={10} fill={CHART_AXIS}>
          keys/server
        </text>
        {bar(counts.plain, 284, '1 pt each', !vnodes)}
        {bar(counts.vn, 304, 'vnodes ×3', vnodes)}
      </svg>

      <p className="mt-2 min-h-10 font-mono text-[13px] text-ink">
        {lastMove !== null ? (
          <>
            moved {lastMove.moved.size}/{KEYS.length} keys ({pct(lastMove.moved.size)}%) —{' '}
            <span className="text-wrong">
              naive mod-N would have moved {lastMove.naive}/{KEYS.length} ({pct(lastMove.naive)}%)
            </span>
          </>
        ) : (
          <span className="text-ink-soft">add or remove a server — the readout compares ring movement vs naive mod-N</span>
        )}
      </p>
    </InteractiveShell>
  )
}
