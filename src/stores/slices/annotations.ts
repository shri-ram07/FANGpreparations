import type { StateCreator } from 'zustand'
import type { AppState } from '../app'
import type { Anchor } from '@/lib/anchor'
import { localDay } from '@/lib/dates'

export interface Annotation extends Anchor {
  id: string
  /** Hex, no alpha — the alpha is applied at paint time so dark picks stay readable. */
  color: string
  /** Empty string = a plain highlight. Anything else renders as a sticky note. */
  note: string
  day: string
}

export interface AnnotationSlice {
  /** moduleId -> annotations, in creation order. */
  annotations: Record<string, Annotation[]>
  addAnnotation: (moduleId: string, a: Anchor, color: string, note?: string) => string
  updateAnnotation: (moduleId: string, id: string, patch: Partial<Pick<Annotation, 'color' | 'note'>>) => void
  removeAnnotation: (moduleId: string, id: string) => void
}

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()).slice(2)

export const createAnnotationSlice: StateCreator<AppState, [], [], AnnotationSlice> = (set) => ({
  annotations: {},

  addAnnotation: (moduleId, a, color, note = '') => {
    const id = newId()
    set((s) => ({
      annotations: { ...s.annotations, [moduleId]: [...(s.annotations[moduleId] ?? []), { ...a, id, color, note, day: localDay() }] },
    }))
    return id
  },

  updateAnnotation: (moduleId, id, patch) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [moduleId]: (s.annotations[moduleId] ?? []).map((x) => (x.id === id ? { ...x, ...patch } : x)),
      },
    })),

  removeAnnotation: (moduleId, id) =>
    set((s) => {
      const left = (s.annotations[moduleId] ?? []).filter((x) => x.id !== id)
      const next = { ...s.annotations }
      // Drop the key entirely when the last one goes, so the persisted blob does
      // not accumulate an empty array per module ever visited.
      if (left.length === 0) delete next[moduleId]
      else next[moduleId] = left
      return { annotations: next }
    }),
})
