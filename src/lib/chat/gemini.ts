// The chat backend. Two jobs: hold the user's own API key, and stream answers.
//
// The key lives in its OWN localStorage entry, deliberately NOT in the zustand
// store. The store has no partialize, so everything in it lands in the backup
// file downloadProgress() writes (src/stores/migrations.ts) — a key in there
// would leak the moment a backup is shared. Separate entry, no migration.
//
// There is no key in this repo, this bundle, or the deployed site. Frontend-only
// code cannot hide one: the browser must decrypt it to make the call, so the
// decryption key ships alongside it. Bring-your-own-key is the honest version.

import type { GenerateContentResponse } from '@google/genai'

const KEY_ENTRY = 'faang-prep-gemini-key'
const MODEL = 'gemini-flash-latest'

export const getKey = (): string => localStorage.getItem(KEY_ENTRY) ?? ''
export const setKey = (k: string) => localStorage.setItem(KEY_ENTRY, k.trim())
export const clearKey = () => localStorage.removeItem(KEY_ENTRY)

export interface Msg {
  role: 'user' | 'model'
  text: string
}

const INSTRUCTION = `You are a study buddy inside a FAANG-interview prep site. The reader is a student, not a senior engineer.

Answer SHORT and DIRECT. No preamble, no "Great question", no restating the question, no summary at the end. Lead with the answer in the first sentence.

Target 2-4 sentences. Use a short bullet list only when the answer is genuinely a list. Plain prose otherwise.

Define a term the first time you use it. Prefer a concrete number or example over an adjective.

If you are not sure, say "not sure" and say what would settle it. Never invent a figure, a paper, or an API.

When PAGE CONTEXT is given, answer about that specific material rather than the topic in general.`

/** Session state, ADK's shape: the turns plus a free-form state bag. */
export interface Session {
  messages: Msg[]
  state: Record<string, unknown>
}

export function buildContext(s: {
  moduleTitle?: string
  selection?: string
  page?: string
}): string {
  const parts: string[] = []
  if (s.moduleTitle) parts.push(`The reader is on the module "${s.moduleTitle}".`)
  if (s.selection) parts.push(`They have selected this text:\n"""\n${s.selection}\n"""`)
  // The page can be long; the tail is usually boilerplate, the head is the teaching.
  if (s.page) parts.push(`Page content:\n"""\n${s.page.slice(0, 6000)}\n"""`)
  return parts.length === 0 ? '' : `PAGE CONTEXT\n${parts.join('\n\n')}\n\n---\n\n`
}

/**
 * Streams one answer. Yields text deltas.
 *
 * @google/genai is loaded on first send, not at page load — it is ~835kb and
 * most visits never open the chat.
 */
export async function* streamAnswer(
  messages: Msg[],
  context: string,
  signal: AbortSignal,
): AsyncGenerator<string> {
  const key = getKey()
  if (key === '') throw new Error('No API key set.')

  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: key })

  // Context rides on the latest user turn so it reflects the page they are on
  // NOW, not the page they were on when the conversation started.
  const contents = messages.map((m, i) => ({
    role: m.role,
    parts: [{ text: i === messages.length - 1 ? context + m.text : m.text }],
  }))

  let stream: AsyncGenerator<GenerateContentResponse>
  try {
    stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: INSTRUCTION, abortSignal: signal },
    })
  } catch (e) {
    throw new Error(friendly(e))
  }

  try {
    for await (const chunk of stream) {
      if (signal.aborted) return
      const t = chunk.text
      if (t) yield t
    }
  } catch (e) {
    if (signal.aborted) return
    throw new Error(friendly(e))
  }
}

/** Google's errors arrive as a JSON blob in the message. Say the useful part. */
function friendly(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  if (/API key not valid|API_KEY_INVALID|400/.test(raw)) return 'That API key was rejected. Check it in the key panel.'
  if (/PERMISSION_DENIED|403/.test(raw)) return 'The key is valid but not allowed to call the Gemini API. Enable it in Google AI Studio.'
  if (/RESOURCE_EXHAUSTED|429/.test(raw)) return 'Rate limit hit on the free tier. Wait a minute and ask again.'
  if (/Failed to fetch|NetworkError/.test(raw)) return 'Could not reach Google. Check your connection.'
  return raw
}
