// Anchoring highlights to text that survives a reload — and survives the
// content being edited underneath them.
//
// An anchor is (block index, char offset, the exact text). The index is the
// fast path; the text is the truth. If the block at that index no longer holds
// that text — a paragraph was inserted above, a sentence reworded — we search
// every block for `prefix + text`, then for `text` alone. That is why a
// highlight put on "0.195%" in the LoRA module still lands after the module is
// rewritten around it.
//
// ponytail: the resolve step is pure and takes plain strings, so it is testable
// without a DOM. See scripts/anchor.test.mjs.

export interface Anchor {
  /** Index into blocksIn(root). A hint, not a guarantee. */
  blockIndex: number
  start: number
  end: number
  /** The exact selected text. This is what makes the anchor recoverable. */
  text: string
  /** Up to 24 chars before the selection, to disambiguate a repeated phrase. */
  prefix: string
}

// Leaf text containers only. A <li> inside a <ul> counts; the <ul> does not,
// which is what stops the same characters being indexed twice.
const BLOCK_SEL = 'p, li, h1, h2, h3, h4, pre, blockquote, figcaption, summary, td, th'

export function blocksIn(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(BLOCK_SEL)].filter(
    (el) => !el.closest('[data-no-anno]') && el.querySelector(BLOCK_SEL) === null,
  )
}

/**
 * Locate an anchor among the block texts. Pure — no DOM.
 * Returns the block index and the start offset within it, or null.
 */
export function resolveIndex(texts: string[], a: Anchor): { i: number; start: number } | null {
  if (a.text === '') return null

  const hinted = texts[a.blockIndex]
  if (hinted !== undefined && hinted.slice(a.start, a.end) === a.text) return { i: a.blockIndex, start: a.start }

  if (a.prefix !== '') {
    const needle = a.prefix + a.text
    for (let i = 0; i < texts.length; i++) {
      const j = texts[i]!.indexOf(needle)
      if (j >= 0) return { i, start: j + a.prefix.length }
    }
  }

  for (let i = 0; i < texts.length; i++) {
    const j = texts[i]!.indexOf(a.text)
    if (j >= 0) return { i, start: j }
  }
  return null
}

/** Character offset of (node, offset) within block.textContent. */
function offsetIn(block: HTMLElement, node: Node, offset: number): number {
  // Range.toString() concatenates exactly the text nodes textContent does, so
  // measuring the range that ends at the caret gives the offset directly —
  // and it handles an element container (where offset is a child index) for free.
  const pre = document.createRange()
  pre.selectNodeContents(block)
  pre.setEnd(node, offset)
  return pre.toString().length
}

function rangeIn(block: HTMLElement, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
  const r = document.createRange()
  let at = 0
  let started = false
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = n.nodeValue?.length ?? 0
    if (!started && at + len > start) {
      r.setStart(n, start - at)
      started = true
    }
    if (started && at + len >= end) {
      r.setEnd(n, end - at)
      return r
    }
    at += len
  }
  return null
}

export function rangeFor(root: HTMLElement, a: Anchor): Range | null {
  const blocks = blocksIn(root)
  const hit = resolveIndex(
    blocks.map((b) => b.textContent ?? ''),
    a,
  )
  if (!hit) return null
  return rangeIn(blocks[hit.i]!, hit.start, hit.start + a.text.length)
}

/**
 * Build an anchor from the live selection. A selection that spans two blocks is
 * clipped to the first — partial is better than lost, and a multi-block anchor
 * would break the moment anything between them changed.
 */
export function anchorFromSelection(root: HTMLElement, sel: Selection | null): Anchor | null {
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const r = sel.getRangeAt(0)
  const raw = r.toString()
  if (raw.trim() === '') return null
  if (!root.contains(r.startContainer)) return null

  const blocks = blocksIn(root)
  const block = blocks.find((b) => b.contains(r.startContainer))
  if (!block) return null

  const full = block.textContent ?? ''
  const start = offsetIn(block, r.startContainer, r.startOffset)
  const text = full.slice(start, start + raw.length)
  if (text.trim() === '') return null

  return {
    blockIndex: blocks.indexOf(block),
    start,
    end: start + text.length,
    text,
    prefix: full.slice(Math.max(0, start - 24), start),
  }
}

/** Character position under the pointer, as (block index, offset). */
export function pointToOffset(root: HTMLElement, x: number, y: number): { blockIndex: number; offset: number } | null {
  // caretPositionFromPoint is the standard; caretRangeFromPoint is the older
  // WebKit spelling. Chrome has both, Safari only the second.
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
    caretRangeFromPoint?: (x: number, y: number) => Range | null
  }
  let node: Node | null = null
  let off = 0
  const pos = doc.caretPositionFromPoint?.(x, y)
  if (pos) {
    node = pos.offsetNode
    off = pos.offset
  } else {
    const rng = doc.caretRangeFromPoint?.(x, y)
    if (rng) {
      node = rng.startContainer
      off = rng.startOffset
    }
  }
  if (!node || !root.contains(node)) return null

  const blocks = blocksIn(root)
  const block = blocks.find((b) => b.contains(node))
  if (!block) return null
  return { blockIndex: blocks.indexOf(block), offset: offsetIn(block, node, off) }
}
