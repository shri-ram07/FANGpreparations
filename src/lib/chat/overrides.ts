// Swapping a chat answer into the page, without touching the DOM or the cache.
//
// loadModule() (src/content/registry.ts) caches Module objects in a Map, and the
// SAME object is read by review, revision and interview mode. Mutating it would
// corrupt every other page, so this clones before writing and returns the clone.
//
// Matching reuses resolveIndex from the highlighter: try prefix + find first so a
// phrase that appears twice resolves to the one actually selected, then find
// alone, then give up rather than replace the wrong text.

import { resolveIndex } from '@/lib/anchor'
import type { Module } from '@/content/types'

export interface Override {
  id: string
  moduleId: string
  /** The exact text being replaced. */
  find: string
  /** Up to 24 chars before it, to disambiguate a repeated phrase. */
  prefix: string
  replace: string
}

/** The prose fields a replacement is allowed to touch, in reading order.
 *
 *  code.code and math.latex[] are deliberately absent: those are verified by
 *  scripts/dsa-behaviour.py and rendered by KaTeX. Dropping prose into either
 *  would silently break content the repo tests. */
function textSlots(m: Module): { text: string; write: (v: string) => void }[] {
  const out: { text: string; write: (v: string) => void }[] = []
  out.push({ text: m.whyItMatters, write: (v) => (m.whyItMatters = v) })
  m.assumes?.forEach((a, i) => out.push({ text: a, write: (v) => (m.assumes![i] = v) }))
  for (const s of m.sections) {
    if (s.type === 'intuition' || s.type === 'note') {
      const head = s.type === 'intuition' ? s.title : s.label
      if (head) out.push({ text: head, write: (v) => (s.type === 'intuition' ? (s.title = v) : (s.label = v)) })
      out.push({ text: s.md, write: (v) => (s.md = v) })
    } else if (s.type === 'hinglish') {
      out.push({ text: s.md, write: (v) => (s.md = v) })
    } else if (s.type === 'math' && s.intro) {
      out.push({ text: s.intro, write: (v) => (s.intro = v) })
    }
  }
  return out
}

export function applyOverrides(module: Module, overrides: Override[]): Module {
  const mine = overrides.filter((o) => o.moduleId === module.id && o.find !== '')
  if (mine.length === 0) return module

  const next = structuredClone(module)
  for (const o of mine) {
    // Re-read the slots each time so a second override sees the first one's edit.
    const slots = textSlots(next)
    const hit = resolveIndex(
      slots.map((s) => s.text),
      { blockIndex: -1, start: 0, end: 0, text: o.find, prefix: o.prefix },
    )
    if (!hit) continue
    const s = slots[hit.i]!
    s.write(s.text.slice(0, hit.start) + o.replace + s.text.slice(hit.start + o.find.length))
  }
  return next
}
