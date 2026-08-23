import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useApp } from '@/stores/app'
import type { Annotation } from '@/stores/slices/annotations'
import { anchorFromSelection, pointToOffset, rangeFor, type Anchor } from '@/lib/anchor'
import { clearPaint, paint, supported } from '@/lib/paint'

const SWATCHES = ['#fde047', '#86efac', '#93c5fd', '#f9a8d4', '#fdba74', '#d8b4fe']

interface Props {
  moduleId: string
  /** The element whose text can be annotated. */
  rootRef: RefObject<HTMLElement | null>
  /** Bumped by the caller when the content changes shape (e.g. a module loads). */
  contentKey?: string | number
}

export function Annotator({ moduleId, rootRef, contentKey }: Props) {
  const all = useApp((s) => s.annotations)
  const add = useApp((s) => s.addAnnotation)
  const update = useApp((s) => s.updateAnnotation)
  const remove = useApp((s) => s.removeAnnotation)
  const anns = useMemo(() => all[moduleId] ?? [], [all, moduleId])

  // A selection waiting for a colour, or an existing highlight that was clicked.
  const [pending, setPending] = useState<{ anchor: Anchor; rect: DOMRect } | null>(null)
  const [picked, setPicked] = useState<{ id: string; rect: DOMRect } | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [orphans, setOrphans] = useState<string[]>([])
  // Bumped whenever the laid-out content moves, so highlights and note positions
  // are recomputed: shiki arriving, a quiz expanding, the window resizing.
  const [tick, setTick] = useState(0)

  const railRef = useRef<HTMLDivElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  /* ---------- paint highlights ---------- */
  useEffect(() => {
    const missing = paint(rootRef.current, anns)
    setOrphans((prev) => (prev.length === missing.length && prev.every((id, i) => id === missing[i]) ? prev : missing))
    return () => clearPaint()
  }, [anns, rootRef, contentKey, tick])

  /* ---------- recompute when the content moves ---------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const bump = () => setTick((t) => t + 1)
    const ro = new ResizeObserver(bump)
    ro.observe(root)
    window.addEventListener('resize', bump)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', bump)
    }
  }, [rootRef, contentKey])

  /* ---------- selection -> toolbar ---------- */
  // Driven by mouseup, NOT selectionchange. Clicking a swatch collapses the
  // selection, and reacting to that would unmount the toolbar before the click
  // landed on it. The anchor is captured here, so the live selection is not
  // needed afterwards and the popover does not have to fight to preserve it.
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const onUp = (e: MouseEvent) => {
      if (!(e.target instanceof Node)) return
      if (popRef.current?.contains(e.target)) return // a click on the popover itself
      if (!root.contains(e.target)) {
        setPending(null)
        return
      }
      const sel = window.getSelection()
      const anchor = anchorFromSelection(root, sel)
      if (!anchor || !sel) {
        setPending(null)
        return
      }
      setPicked(null)
      setPending({ anchor, rect: sel.getRangeAt(0).getBoundingClientRect() })
    }
    document.addEventListener('mouseup', onUp)
    return () => document.removeEventListener('mouseup', onUp)
  }, [rootRef])

  /* ---------- click an existing highlight ---------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Node) || !root.contains(e.target)) return
      if (!window.getSelection()?.isCollapsed) return // a drag, not a click
      const at = pointToOffset(root, e.clientX, e.clientY)
      if (!at) return
      const hit = anns.find((a) => a.blockIndex === at.blockIndex && at.offset >= a.start && at.offset < a.end)
      if (!hit) return
      const r = rangeFor(root, hit)
      if (!r) return
      setPending(null)
      setPicked({ id: hit.id, rect: r.getBoundingClientRect() })
    }
    root.addEventListener('click', onClick)
    return () => root.removeEventListener('click', onClick)
  }, [rootRef, anns])

  /* ---------- dismiss popovers ---------- */
  useEffect(() => {
    const close = () => {
      setPending(null)
      setPicked(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('scroll', close, true)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const create = useCallback(
    (color: string, withNote: boolean) => {
      if (!pending) return
      const id = add(moduleId, pending.anchor, color)
      setPending(null)
      window.getSelection()?.removeAllRanges()
      if (withNote) setEditing(id)
    },
    [pending, add, moduleId],
  )

  // Without CSS.highlights a colour-only mark would be invisible, so in that
  // case every annotation goes to the rail rather than only the noted ones.
  const canPaint = supported()
  const noted = anns.filter((a) => !canPaint || a.note !== '' || a.id === editing)

  return (
    <>
      {pending && (
        <Toolbar popRef={popRef} rect={pending.rect} onPick={(c) => create(c, false)} onNote={(c) => create(c, true)} />
      )}

      {picked && (
        <Toolbar
          popRef={popRef}
          rect={picked.rect}
          current={anns.find((a) => a.id === picked.id)?.color}
          onPick={(c) => {
            update(moduleId, picked.id, { color: c })
            setPicked(null)
          }}
          onNote={() => {
            setEditing(picked.id)
            setPicked(null)
          }}
          onRemove={() => {
            remove(moduleId, picked.id)
            setPicked(null)
          }}
        />
      )}

      <Rail
        railRef={railRef}
        rootRef={rootRef}
        notes={noted}
        orphans={orphans}
        tick={tick}
        editing={editing}
        onEdit={setEditing}
        onSave={(id, note) => {
          if (note.trim() === '') remove(moduleId, id)
          else update(moduleId, id, { note })
          setEditing(null)
        }}
        onRemove={(id) => {
          remove(moduleId, id)
          setEditing(null)
        }}
      />

      {!canPaint && anns.length > 0 && (
        <p className="mt-4 max-w-[70ch] rounded-lg border border-line bg-raised px-3 py-2 text-xs text-ink-soft">
          Your browser lacks the CSS Custom Highlight API, so highlights cannot be painted onto the text. All{' '}
          {anns.length} of your marks are listed in full below instead — nothing is lost.
        </p>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ */

function Toolbar({
  popRef,
  rect,
  current,
  onPick,
  onNote,
  onRemove,
}: {
  popRef: RefObject<HTMLDivElement>
  rect: DOMRect
  current?: string
  onPick: (color: string) => void
  onNote: (color: string) => void
  onRemove?: () => void
}) {
  const [custom, setCustom] = useState(current ?? SWATCHES[0]!)
  const colorRef = useRef<HTMLInputElement>(null)

  // React maps onChange for <input type="color"> to the `input` event, which
  // fires on every pixel of drag — one annotation per pixel. The native
  // `change` event fires once, when the picker is dismissed. That is the commit.
  useEffect(() => {
    const el = colorRef.current
    if (!el) return
    const commit = () => onPick(el.value)
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [onPick])

  // Fixed against the viewport rect, centred by transform so the width does not
  // have to be known. Dismissed on scroll rather than tracked.
  const top = Math.max(8, rect.top - 46)
  const left = Math.min(Math.max(170, rect.left + rect.width / 2), window.innerWidth - 170)

  return (
    <div
      ref={popRef}
      style={{ top, left, transform: 'translateX(-50%)' }}
      className="fixed z-50 flex items-center gap-1 rounded-lg border border-line bg-bg px-1.5 py-1 shadow-lg"
    >
      {SWATCHES.map((c) => (
        <button
          key={c}
          onClick={() => onPick(c)}
          aria-label={`Highlight ${c}`}
          style={{ background: c }}
          className={`size-5 rounded-full border transition-transform hover:scale-110 ${
            current === c ? 'border-ink ring-1 ring-ink' : 'border-black/15'
          }`}
        />
      ))}
      <label
        className="ml-0.5 grid size-5 cursor-pointer place-items-center rounded-full border border-black/15 text-[9px] leading-none"
        style={{ background: `conic-gradient(#f87171,#fbbf24,#4ade80,#38bdf8,#a78bfa,#f87171)` }}
        title="Custom colour"
      >
        <input
          ref={colorRef}
          type="color"
          value={custom}
          onChange={(e) => setCustom(e.target.value)} // preview only; commit is the native `change`
          className="size-0 opacity-0"
        />
      </label>
      <span className="mx-1 h-4 w-px bg-line" />
      <button
        onClick={() => onNote(custom)}
        className="rounded px-2 py-0.5 text-xs font-medium text-ink-soft hover:bg-raised hover:text-ink"
      >
        📝 Note
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          className="rounded px-2 py-0.5 text-xs font-medium text-ink-soft hover:bg-raised hover:text-wrong"
        >
          Remove
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */

interface RailProps {
  railRef: RefObject<HTMLDivElement>
  rootRef: RefObject<HTMLElement | null>
  notes: Annotation[]
  orphans: string[]
  tick: number
  editing: string | null
  onEdit: (id: string | null) => void
  onSave: (id: string, note: string) => void
  onRemove: (id: string) => void
}

function Rail({ railRef, rootRef, notes, orphans, tick, editing, onEdit, onSave, onRemove }: RailProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const [tops, setTops] = useState<Record<string, number>>({})

  // Place each card level with its anchor, then push overlapping cards down.
  //
  // Two things this has to get right, both learned the hard way:
  //  - Cards must be placed in ANCHOR order, not creation order. Highlighting a
  //    late paragraph first and an early one second would otherwise push the
  //    early note below the late one.
  //  - The first pass measures heights that do not exist yet and falls back to
  //    an estimate, so `tops` is a dependency: the effect re-runs once with real
  //    heights and the equality check below stops it there.
  useLayoutEffect(() => {
    const root = rootRef.current
    const rail = railRef.current
    if (!root || !rail) return
    const base = rail.getBoundingClientRect().top

    const wants = notes.map((a) => {
      const r = rangeFor(root, a)
      // A note whose text vanished has no anchor; sink it to the bottom rather
      // than pinning it to the top of the rail.
      return { id: a.id, want: r ? r.getBoundingClientRect().top - base : Number.POSITIVE_INFINITY }
    })
    wants.sort((x, y) => x.want - y.want)

    const placed: Record<string, number> = {}
    let floor = 0
    for (const w of wants) {
      const top = Math.max(Number.isFinite(w.want) ? w.want : floor, floor)
      placed[w.id] = top
      floor = top + (cardRefs.current.get(w.id)?.offsetHeight || 96) + 10
    }

    setTops((prev) => {
      const same = notes.length === Object.keys(prev).length && notes.every((a) => prev[a.id] === placed[a.id])
      return same ? prev : placed
    })
  }, [notes, orphans, tick, editing, tops, rootRef, railRef])

  const card = (a: Annotation, absolute: boolean) => (
    <div
      key={a.id}
      // Only the rail copy is measured. The fallback list renders the same
      // annotation ids and is display:none at this width, so letting it register
      // would overwrite every height with 0.
      ref={
        absolute
          ? (el) => {
              if (el) cardRefs.current.set(a.id, el)
              else cardRefs.current.delete(a.id)
            }
          : undefined
      }
      style={
        absolute
          ? { top: tops[a.id] ?? 0, borderLeftColor: a.color }
          : { borderLeftColor: a.color }
      }
      className={`${absolute ? 'absolute w-full' : ''} rounded-r-md border border-l-[5px] border-line bg-raised px-2.5 py-2 shadow-sm transition-[top] duration-150`}
    >
      <p className="mb-1 line-clamp-2 text-[11px] leading-snug text-ink-soft italic">
        {orphans.includes(a.id) ? '⚠ text moved · ' : ''}“{a.text}”
      </p>
      {editing === a.id ? (
        <Editor initial={a.note} onSave={(v) => onSave(a.id, v)} onCancel={() => onEdit(null)} />
      ) : (
        <>
          <p className="text-[13px] leading-snug break-words whitespace-pre-wrap">{a.note}</p>
          <div className="mt-1.5 flex gap-2 text-[11px] text-ink-soft">
            <button onClick={() => onEdit(a.id)} className="hover:text-accent">
              Edit
            </button>
            <button onClick={() => onRemove(a.id)} className="hover:text-wrong">
              Delete
            </button>
            <span className="ml-auto">{a.day.slice(5)}</span>
          </div>
        </>
      )}
    </div>
  )

  return (
    <>
      {/* Wide screens: a margin column, each note beside the paragraph it came from. */}
      <div ref={railRef} className="relative hidden w-56 shrink-0 xl:block">
        {notes.map((a) => card(a, true))}
      </div>

      {/* Narrow screens: the same notes, stacked at the end of the module. */}
      {notes.length > 0 && (
        <section className="my-8 xl:hidden">
          <h2 className="text-xl font-bold">Your notes</h2>
          <div className="mt-3 max-w-[70ch] space-y-2">
            {[...notes].sort((a, b) => (tops[a.id] ?? 0) - (tops[b.id] ?? 0)).map((a) => card(a, false))}
          </div>
        </section>
      )}
    </>
  )
}

function Editor({ initial, onSave, onCancel }: { initial: string; onSave: (v: string) => void; onCancel: () => void }) {
  const [v, setV] = useState(initial)
  return (
    <div>
      <textarea
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave(v)
        }}
        rows={4}
        placeholder="Your note…"
        className="w-full resize-y rounded border border-line bg-bg px-2 py-1 text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-1 flex gap-2 text-[11px]">
        <button onClick={() => onSave(v)} className="font-medium text-accent hover:underline">
          Save
        </button>
        <button onClick={onCancel} className="text-ink-soft hover:text-ink">
          Cancel
        </button>
        <span className="ml-auto text-ink-soft">⌘↵</span>
      </div>
    </div>
  )
}
