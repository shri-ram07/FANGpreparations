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
// Pinned, not a "-latest" alias: an alias can resolve to a preview model that a
// free-tier key cannot call, which fails as an unhelpful 404 for the reader.
const MODEL = 'gemini-2.5-flash'

export const getKey = (): string => localStorage.getItem(KEY_ENTRY) ?? ''
export const setKey = (k: string) => localStorage.setItem(KEY_ENTRY, k.trim())
export const clearKey = () => localStorage.removeItem(KEY_ENTRY)

/**
 * Ask Google directly what it thinks of a key, and report the answer verbatim.
 *
 * "API key not valid" has several different causes that look identical from the
 * chat panel — wrong key type, restricted key, API not enabled, unsupported
 * region. This names which one, and also says whether MODEL is actually offered
 * to that key, which no amount of guessing from the error text can tell us.
 */
export async function testKey(key: string): Promise<string> {
  const k = key.trim()
  if (k === '') return 'No key entered.'
  if (!k.startsWith('AIza'))
    return `That does not look like a Gemini API key (they start with "AIza"). You may have pasted an OAuth client id, a project number, or a service-account field instead. Got ${k.length} characters starting "${k.slice(0, 6)}".`

  let res: Response
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(k)}`)
  } catch (e) {
    return `Could not reach Google at all: ${e instanceof Error ? e.message : String(e)}. A network block or extension may be stopping the request.`
  }
  const body = await res.text()

  if (res.ok) {
    let names: string[] = []
    try {
      names = ((JSON.parse(body).models ?? []) as { name: string }[]).map((m) => m.name.replace('models/', ''))
    } catch {
      return `Key works, but the model list did not parse: ${body.slice(0, 200)}`
    }
    const flash = names.filter((n) => n.includes('flash')).slice(0, 8).join(', ')
    return names.includes(MODEL)
      ? `Key works. ${MODEL} is available. (${names.length} models in total.)`
      : `Key works, but ${MODEL} is NOT offered to it. Flash models it does offer: ${flash || 'none'}.`
  }

  let err: { status?: string; message?: string; details?: { reason?: string }[] } | undefined
  try {
    err = JSON.parse(body).error
  } catch {
    /* fall through to the raw body */
  }
  const reason = err?.details?.find((d) => d.reason)?.reason ?? ''
  return `HTTP ${res.status} ${err?.status ?? ''} ${reason}
${err?.message ?? body.slice(0, 300)}`
}

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

  // The UI appends an EMPTY model turn as a streaming placeholder before calling
  // this. Sending it makes the conversation end on a model turn, which Gemini
  // rejects with a 400 — so drop it here, where every caller routes through.
  const turns = messages.filter(
    (m, i) => !(i === messages.length - 1 && m.role === 'model' && m.text === ''),
  )

  // Context rides on the latest turn so it reflects the page they are on NOW,
  // not the page they were on when the conversation started.
  const contents = turns.map((m, i) => ({
    role: m.role,
    parts: [{ text: i === turns.length - 1 ? context + m.text : m.text }],
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

/** The SDK throws ApiError whose message is JSON wrapping more JSON. Dig out the
 *  sentence a human wrote. */
function googleMessage(raw: string): string {
  let cur = raw
  for (let i = 0; i < 3; i++) {
    const brace = cur.indexOf('{')
    if (brace < 0) break
    try {
      const inner: unknown = JSON.parse(cur.slice(brace))
      const m = (inner as { error?: { message?: unknown } })?.error?.message
      if (typeof m !== 'string') break
      cur = m
      if (!m.trimStart().startsWith('{')) return m
    } catch {
      break
    }
  }
  return cur === raw ? '' : cur
}

/** Match on the REASON Google gives, never on the bare status code: a malformed
 *  request is also a 400, and reporting that as "bad key" sends you hunting for
 *  a problem that is not there. */
export function friendly(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  const hay = googleMessage(raw) || raw
  if (/API key not valid|API_KEY_INVALID|API key expired/i.test(hay))
    return 'That API key was rejected by Google. Open the Key panel and paste a valid one.'
  if (/SERVICE_DISABLED|has not been used in project|PERMISSION_DENIED/i.test(hay))
    return 'The key is valid but the Gemini API is not enabled for it. Enable it in Google AI Studio.'
  if (/RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(hay))
    return 'Rate limit or quota hit. Wait a minute and ask again.'
  if (/not found|NOT_FOUND|is not supported/i.test(hay)) return `Model unavailable for this key: ${hay}`
  if (/Failed to fetch|NetworkError|ERR_NAME|ERR_INTERNET/i.test(hay))
    return 'Could not reach Google. Check your connection.'
  return hay
}
