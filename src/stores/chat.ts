// The chat's own store. Plain create(), NO persist middleware — the chosen
// behaviour is session-only, so making it unpersistable is cheaper and more
// honest than persisting it and clearing it later. useApp is untouched, and
// CURRENT_VERSION stays 4 because nothing new is stored on disk.

import { create } from 'zustand'
import type { Msg } from '@/lib/chat/gemini'
import type { Override } from '@/lib/chat/overrides'

export interface ChatState {
  open: boolean
  messages: Msg[]
  /** ADK-shaped session state: a free-form bag carried across turns. */
  state: Record<string, unknown>
  overrides: Override[]
  pending: boolean
  error: string
  /** What the reader selected on the page, if anything — context and replace target. */
  selection: { text: string; prefix: string; moduleId: string } | null

  setOpen: (v: boolean) => void
  setSelection: (s: ChatState['selection']) => void
  addUser: (text: string) => void
  startModel: () => void
  appendModel: (delta: string) => void
  finish: (error?: string) => void
  reset: () => void
  addOverride: (o: Override) => void
  removeOverride: (id: string) => void
  clearOverrides: (moduleId: string) => void
}

export const useChat = create<ChatState>()((set) => ({
  open: false,
  messages: [],
  state: {},
  overrides: [],
  pending: false,
  error: '',
  selection: null,

  setOpen: (open) => set({ open }),
  setSelection: (selection) => set({ selection }),
  addUser: (text) => set((s) => ({ messages: [...s.messages, { role: 'user', text }], error: '' })),
  startModel: () => set((s) => ({ messages: [...s.messages, { role: 'model', text: '' }], pending: true })),
  appendModel: (delta) =>
    set((s) => {
      const messages = s.messages.slice()
      const last = messages[messages.length - 1]
      if (last?.role === 'model') messages[messages.length - 1] = { ...last, text: last.text + delta }
      return { messages }
    }),
  finish: (error = '') =>
    set((s) => {
      // An aborted or failed stream can leave an empty model bubble. Drop it,
      // otherwise the panel shows a blank reply with no explanation.
      const last = s.messages[s.messages.length - 1]
      const messages = last?.role === 'model' && last.text === '' ? s.messages.slice(0, -1) : s.messages
      return { messages, pending: false, error }
    }),
  reset: () => set({ messages: [], state: {}, pending: false, error: '' }),
  addOverride: (o) => set((s) => ({ overrides: [...s.overrides, o] })),
  removeOverride: (id) => set((s) => ({ overrides: s.overrides.filter((o) => o.id !== id) })),
  clearOverrides: (moduleId) => set((s) => ({ overrides: s.overrides.filter((o) => o.moduleId !== moduleId) })),
}))
