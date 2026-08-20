// Lazy chunk: markmap-lib (Transformer) + markmap-view (+ its d3 slice).
// Create once, setData on change; destroy on unmount (StrictMode-safe).
import { useEffect, useRef } from 'react'
// no-plugins entry: our outlines are plain indented markdown — the default
// entry statically bundles katex + prism plugins into this chunk for nothing.
import { Transformer } from 'markmap-lib/no-plugins'
import { Markmap } from 'markmap-view'

const transformer = new Transformer([])

// XMLSerializer on the live SVG loses stylesheet-applied styles — the PNG
// would come out unstyled. Clone, inline the .markmap CSS rules, give
// explicit size + white background, rasterize via <img> -> canvas.
// System font stack on purpose: webfont url()s are not fetched during
// SVG-image rasterization, so declaring them would silently fall back anyway.
async function downloadPng(svg: SVGSVGElement, name: string, scale = 2) {
  const { width, height } = svg.getBoundingClientRect()
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  style.textContent =
    [...document.styleSheets]
      .flatMap((s) => {
        try {
          return [...s.cssRules].filter((r) => r.cssText.includes('.markmap')).map((r) => r.cssText)
        } catch {
          return [] // cross-origin sheets throw — skip
        }
      })
      .join('\n') + '\nsvg{font-family:ui-sans-serif,system-ui,sans-serif;background:#fff}'
  clone.prepend(style)
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${name}.png`
    a.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function MindMap({ markdown, title }: { markdown: string; title: string }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mmRef = useRef<Markmap | null>(null)

  useEffect(() => {
    const svg = svgRef.current!
    const mm = Markmap.create(svg, { autoFit: true, duration: 300 })
    mmRef.current = mm
    const ro = new ResizeObserver(() => void mm.fit())
    ro.observe(svg.parentElement!)
    return () => {
      ro.disconnect()
      mm.destroy()
      mmRef.current = null
    }
  }, [])

  useEffect(() => {
    const mm = mmRef.current
    if (!mm) return
    const { root } = transformer.transform(markdown)
    void Promise.resolve(mm.setData(root)).then(() => mm.fit())
  }, [markdown])

  return (
    <div className="relative h-[420px] w-full rounded-lg border border-line">
      <svg ref={svgRef} className="h-full w-full" />
      <div className="absolute right-2 bottom-2 flex gap-2">
        <button
          onClick={() => void mmRef.current?.fit()}
          className="rounded-md border border-line bg-bg px-2.5 py-1 text-xs text-ink-soft hover:text-ink"
        >
          Fit
        </button>
        <button
          onClick={() => svgRef.current && void downloadPng(svgRef.current, title)}
          className="rounded-md border border-line bg-bg px-2.5 py-1 text-xs text-ink-soft hover:text-ink"
        >
          Download as image
        </button>
      </div>
    </div>
  )
}
