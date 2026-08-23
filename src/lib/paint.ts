// Painting highlights with the CSS Custom Highlight API.
//
// ponytail: native over DOM surgery. The alternative is splitting text nodes and
// injecting <mark> elements, which would mean rewriting md.tsx and would fight
// every re-render. CSS.highlights takes Ranges and paints them with zero DOM
// change, so highlights compose with React instead of racing it.
//
// ::highlight() only accepts colour, background-color, text-decoration and
// text-shadow — which is exactly the set we need.

import type { Annotation } from '@/stores/slices/annotations'
import { rangeFor } from './anchor'

export const supported = () => typeof CSS !== 'undefined' && 'highlights' in CSS

const registered = new Set<string>()
const STYLE_ID = 'anno-highlight-rules'

/** Perceived lightness, 0-1. Dark picks get less alpha so the ink stays readable. */
function lightness(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255
}

function alphaFor(hex: string): string {
  return lightness(hex) > 0.6 ? 'cc' : '59' // 80% for pale, 35% for anything dark
}

const nameFor = (color: string, noted: boolean) => `anno-${color.replace('#', '')}${noted ? '-n' : ''}`

/**
 * Register one Highlight per (colour, has-note) pair and emit matching CSS.
 * Returns the ids that could not be anchored, so the caller can say so.
 */
export function paint(root: HTMLElement | null, anns: Annotation[]): string[] {
  if (!supported()) return []

  for (const name of registered) CSS.highlights.delete(name)
  registered.clear()

  const orphaned: string[] = []
  if (!root) return anns.map((a) => a.id)

  const groups = new Map<string, Range[]>()
  for (const a of anns) {
    const r = rangeFor(root, a)
    if (!r) {
      orphaned.push(a.id)
      continue
    }
    const key = nameFor(a.color, a.note !== '')
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }

  const rules: string[] = []
  for (const [name, ranges] of groups) {
    CSS.highlights.set(name, new Highlight(...ranges))
    registered.add(name)
    const hex = '#' + name.slice(5).replace(/-n$/, '')
    const noted = name.endsWith('-n')
    rules.push(
      `::highlight(${name}){background-color:${hex}${alphaFor(hex)};` +
        (noted ? `text-decoration:underline dotted currentColor;text-underline-offset:3px;` : '') +
        `}`,
    )
  }

  let style = document.getElementById(STYLE_ID)
  if (!style) {
    style = document.createElement('style')
    style.id = STYLE_ID
    document.head.append(style)
  }
  style.textContent = rules.join('\n')

  return orphaned
}

export function clearPaint(): void {
  if (!supported()) return
  for (const name of registered) CSS.highlights.delete(name)
  registered.clear()
}
