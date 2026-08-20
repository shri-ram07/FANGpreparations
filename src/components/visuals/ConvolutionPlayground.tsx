import { useEffect, useMemo, useRef, useState } from 'react'
import { InteractiveShell } from './shell/InteractiveShell'
import { StepControls } from './shell/StepControls'
import { useStepper } from './shell/useStepper'

const N = 12 // input size
const M = 10 // output size (valid conv, no padding)
const CELL = 16 // logical px per cell

type ImgKey = 'edge' | 'cross' | 'diag' | 'dot'
type KerKey = 'identity' | 'edge-detect' | 'blur' | 'sharpen' | 'emboss'

function gen(f: (r: number, c: number) => number): number[][] {
  return Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => f(r, c)))
}

const IMAGES: Record<ImgKey, { label: string; px: number[][] }> = {
  edge: { label: 'edge', px: gen((_r, c) => (c < 6 ? 40 : 220)) },
  cross: { label: 'cross', px: gen((r, c) => (r === 5 || r === 6 || c === 5 || c === 6 ? 230 : 30)) },
  diag: { label: 'diag gradient', px: gen((r, c) => Math.round((255 * (r + c)) / 22)) },
  dot: { label: 'noise dot', px: gen((r, c) => (r === 5 && c === 6 ? 255 : 40)) },
}

const KERNELS: Record<KerKey, number[]> = {
  identity: [0, 0, 0, 0, 1, 0, 0, 0, 0],
  'edge-detect': [0, -1, 0, -1, 4, -1, 0, -1, 0],
  blur: [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
  sharpen: [0, -1, 0, -1, 5, -1, 0, -1, 0],
  emboss: [-2, -1, 0, -1, 1, 1, 0, 1, 2],
}

interface Frame {
  r: number
  c: number
  products: number[]
  sum: number
}

function simulate(img: number[][], k: number[]): Frame[] {
  const frames: Frame[] = []
  for (let r = 0; r < M; r++) {
    for (let c = 0; c < M; c++) {
      const products: number[] = []
      let sum = 0
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          const p = img[r + i]![c + j]! * k[i * 3 + j]!
          products.push(p)
          sum += p
        }
      }
      frames.push({ r, c, products, sum })
    }
  }
  return frames
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const shown = (sum: number) => Math.min(255, Math.round(Math.abs(sum)))

export default function ConvolutionPlayground() {
  const [imgKey, setImgKey] = useState<ImgKey>('edge')
  const [kerStr, setKerStr] = useState<string[]>(KERNELS['edge-detect'].map(String))
  const [kerPreset, setKerPreset] = useState<KerKey | null>('edge-detect')

  const kernel = useMemo(() => kerStr.map((s) => Number(s) || 0), [kerStr])
  const frames = useMemo(() => simulate(IMAGES[imgKey].px, kernel), [imgKey, kernel])
  const stepper = useStepper(frames.length, 140)
  const { reset } = stepper

  useEffect(() => {
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgKey, kerStr])

  const inputRef = useRef<HTMLCanvasElement>(null)
  const outputRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ictx = inputRef.current?.getContext('2d')
    const octx = outputRef.current?.getContext('2d')
    if (!ictx || !octx) return
    const f = frames[stepper.step]!
    const img = IMAGES[imgKey].px

    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const v = img[r]![c]!
        ictx.fillStyle = `rgb(${v},${v},${v})`
        ictx.fillRect(c * CELL, r * CELL, CELL, CELL)
      }
    }
    // receptive field feeding the current output cell
    ictx.strokeStyle = '#2450E5'
    ictx.lineWidth = 2
    ictx.strokeRect(f.c * CELL + 1, f.r * CELL + 1, 3 * CELL - 2, 3 * CELL - 2)

    frames.forEach((g, i) => {
      if (i <= stepper.step) {
        const v = shown(g.sum)
        octx.fillStyle = `rgb(${v},${v},${v})`
      } else {
        octx.fillStyle = '#F6F7F4'
      }
      octx.fillRect(g.c * CELL, g.r * CELL, CELL, CELL)
    })
    octx.strokeStyle = '#2450E5'
    octx.lineWidth = 2
    octx.strokeRect(f.c * CELL + 1, f.r * CELL + 1, CELL - 2, CELL - 2)
  }, [frames, stepper.step, imgKey])

  const f = frames[stepper.step]!
  const mac = f.products.map((p, i) => (i === 0 ? fmt(p) : p < 0 ? ` − ${fmt(-p)}` : ` + ${fmt(p)}`)).join('')

  return (
    <InteractiveShell
      title="One kernel, every position"
      notice="The SAME 9 numbers slide over every position — weight sharing is why this conv layer has 9 parameters where a dense 144→100 layer would need 14,400."
      onReset={() => {
        setImgKey('edge')
        setKerStr(KERNELS['edge-detect'].map(String))
        setKerPreset('edge-detect')
        reset()
      }}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Image:</span>
        {(Object.keys(IMAGES) as ImgKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setImgKey(k)}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              k === imgKey ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {IMAGES[k].label}
          </button>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs text-ink-soft">Kernel:</span>
        {(Object.keys(KERNELS) as KerKey[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              setKerStr(KERNELS[k].map(String))
              setKerPreset(k)
            }}
            className={`rounded-full border px-2.5 py-0.5 text-xs ${
              k === kerPreset ? 'border-accent bg-accent text-white' : 'border-line text-ink-soft hover:border-accent'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0" style={{ flex: '12 1 150px' }}>
          <canvas
            ref={inputRef}
            width={N * CELL}
            height={N * CELL}
            className="rounded border border-line"
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }}
          />
          <p className="mt-1 text-center text-[11px] text-ink-soft">input 12×12</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          <span className="font-mono text-lg text-ink-soft">∗</span>
          <div className="grid grid-cols-3 gap-1">
            {kerStr.map((s, i) => (
              <input
                key={i}
                type="number"
                step={0.1}
                value={s}
                onChange={(e) => {
                  const next = [...kerStr]
                  next[i] = e.target.value
                  setKerStr(next)
                  setKerPreset(null)
                }}
                className="w-14 rounded border border-line bg-bg px-1 py-0.5 text-center font-mono text-[11px] text-ink"
                aria-label={`kernel weight ${i}`}
              />
            ))}
          </div>
          <span className="font-mono text-lg text-ink-soft">=</span>
        </div>
        <div className="min-w-0" style={{ flex: '10 1 130px' }}>
          <canvas
            ref={outputRef}
            width={M * CELL}
            height={M * CELL}
            className="rounded border border-line"
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated' }}
          />
          <p className="mt-1 text-center text-[11px] text-ink-soft">output 10×10 · no padding: 12→10 · shows |v| clamped to 255</p>
        </div>
      </div>

      <p className="my-2 min-h-10 font-mono text-[12px] text-ink">
        out[{f.r}][{f.c}] = {mac} = {fmt(f.sum)} → shown as {shown(f.sum)}
      </p>

      <StepControls stepper={stepper} total={frames.length} />
    </InteractiveShell>
  )
}
