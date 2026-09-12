// The chat backend. Three jobs: hold the user's own API key, work out how Google
// will accept it, and stream answers.
//
// The key lives in its OWN localStorage entry, deliberately NOT in the zustand
// store. The store has no partialize, so everything in it lands in the backup
// file downloadProgress() writes (src/stores/migrations.ts) — a key in there
// would leak the moment a backup is shared. Separate entry, no migration.
//
// There is no key in this repo, this bundle, or the deployed site. Frontend-only
// code cannot hide one: the browser must decrypt it to make the call, so the
// decryption key ships alongside it. Bring-your-own-key is the honest version.
//
// Plain fetch rather than @google/genai. Google is mid-migration from "AIza" API
// keys to "AQ." auth keys, and the two are carried on DIFFERENT transports; the
// SDK always sends x-goog-api-key and offers no way to change that. Owning the
// request is what lets a key be tried every documented way, instead of failing
// with one message that blames the key. It also drops a 347kB dependency.

import { PROVIDERS, clearModel, probeProvider, providerFor, streamOpenAI } from './providers'

const KEY_ENTRY = 'faang-prep-gemini-key'
const TRANSPORT_ENTRY = 'faang-prep-gemini-transport'
// Pinned, not a "-latest" alias: an alias can resolve to a preview model that a
// free-tier key cannot call, which fails as an unhelpful 404 for the reader.
const MODEL = 'gemini-2.5-flash'
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const getKey = (): string => localStorage.getItem(KEY_ENTRY) ?? ''
export const setKey = (k: string) => {
  // A new key may need a different transport; forget what the old one used.
  if (k.trim() !== localStorage.getItem(KEY_ENTRY)) {
    localStorage.removeItem(TRANSPORT_ENTRY)
    clearModel()
  }
  localStorage.setItem(KEY_ENTRY, k.trim())
}
export const clearKey = () => {
  localStorage.removeItem(KEY_ENTRY)
  localStorage.removeItem(TRANSPORT_ENTRY)
  clearModel()
}

/* ---------- how the key is carried ---------- */

/** Google accepts credentials several different ways and does not document which
 *  applies to which key format. Rather than guess, every one is tried against the
 *  real endpoint and the winner is remembered. */
const TRANSPORTS = {
  header: { label: 'x-goog-api-key header', headers: (k: string) => ({ 'x-goog-api-key': k }), query: () => '' },
  query: { label: '?key= parameter', headers: () => ({}), query: (k: string) => `&key=${encodeURIComponent(k)}` },
  bearer: { label: 'Authorization: Bearer', headers: (k: string) => ({ Authorization: `Bearer ${k}` }), query: () => '' },
  token: { label: 'Authorization: Token', headers: (k: string) => ({ Authorization: `Token ${k}` }), query: () => '' },
  access_token: {
    label: '?access_token= parameter',
    headers: () => ({}),
    query: (k: string) => `&access_token=${encodeURIComponent(k)}`,
  },
} as const

export type TransportId = keyof typeof TRANSPORTS
const ORDER = Object.keys(TRANSPORTS) as TransportId[]

/** The transport a key is known to work with, else the best guess for its format. */
export const transportFor = (key: string): TransportId => {
  const saved = localStorage.getItem(TRANSPORT_ENTRY) as TransportId | null
  if (saved !== null && saved in TRANSPORTS) return saved
  return key.startsWith('AQ.') ? 'bearer' : 'header'
}

function request(path: string, key: string, t: TransportId, init: RequestInit = {}) {
  const tr = TRANSPORTS[t]
  // The dummy first parameter is always present so a transport can append with
  // '&' unconditionally, whatever the path already carries.
  return fetch(`${BASE}${path}?_=1${tr.query(key)}`, {
    ...init,
    headers: { ...tr.headers(key), ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
  })
}

/* ---------- the diagnostic ---------- */

/** One token in, one token out — the smallest version of the call the chat
 *  actually makes, so a transport that passes here is one that really works. */
const PROBE_BODY = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
  generationConfig: { maxOutputTokens: 1 },
})

function explain(status: number, body: string): string {
  let err: { status?: string; message?: string; details?: { reason?: string }[] } | undefined
  try {
    err = JSON.parse(body).error
  } catch {
    /* not JSON — fall back to the raw body */
  }
  const reason = err?.details?.find((d) => d.reason)?.reason ?? ''
  return `HTTP ${status} ${err?.status ?? ''} ${reason} — ${(err?.message ?? body).slice(0, 150)}`
}

/**
 * Ask Google directly what it thinks of a key, trying every transport, and
 * report the answers verbatim.
 *
 * "API key not valid" has several causes that look identical from the chat
 * panel — wrong credential type, restricted key, API not enabled, unsupported
 * region, or a key format the transport cannot carry. This names which, and
 * remembers any transport that works so the chat then uses it.
 */
export async function testKey(key: string): Promise<string> {
  const k = key.trim()
  if (k === '') return 'No key entered.'
  const provider = providerFor(k)
  if (provider !== null) {
    const { ok, lines: got } = await probeProvider(provider, k)
    return ok
      ? `Key works, via ${provider.label}.\n\n${got.join('\n')}`
      : `${provider.label} refused this key.\n\n${got.join('\n')}`
  }
  if (!k.startsWith('AIza') && !k.startsWith('AQ.'))
    return `That key is not one this site recognises. It accepts a Google key ("AIza" or "AQ.") or a key from ${PROVIDERS.map((p) => `${p.label} (${p.match('gsk_') ? 'gsk_' : ''}…)`).join(', ')}. Got ${k.length} characters starting "${k.slice(0, 4)}".`

  const lines: string[] = []
  let winner: TransportId | null = null

  for (const id of ORDER) {
    let res: Response
    try {
      res = await request(`/models/${MODEL}:generateContent`, k, id, { method: 'POST', body: PROBE_BODY })
    } catch (e) {
      lines.push(`${TRANSPORTS[id].label}: could not reach Google (${e instanceof Error ? e.message : String(e)})`)
      continue
    }
    const body = await res.text()
    if (res.ok) {
      winner ??= id
      lines.push(`${TRANSPORTS[id].label}: OK`)
      continue
    }
    lines.push(`${TRANSPORTS[id].label}: ${explain(res.status, body)}`)
  }

  if (winner === null) {
    localStorage.removeItem(TRANSPORT_ENTRY)
    const aq = k.startsWith('AQ.')
      ? '\n\nEvery transport refused an "AQ." key, which matches Google\'s own open issue: AI Studio now issues these, but the Gemini REST API does not accept them yet. No frontend change can work around that — it needs a legacy "AIza" key, or a small server-side proxy.'
      : ''
    return `Google refused this key on every transport.\n\n${lines.join('\n')}${aq}`
  }

  localStorage.setItem(TRANSPORT_ENTRY, winner)
  return `Key works, via ${TRANSPORTS[winner].label}. ${MODEL} answered.\n\n${lines.join('\n')}`
}

/* ---------- the chat itself ---------- */

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

export function buildContext(s: { moduleTitle?: string; selection?: string; page?: string }): string {
  const parts: string[] = []
  if (s.moduleTitle) parts.push(`The reader is on the module "${s.moduleTitle}".`)
  if (s.selection) parts.push(`They have selected this text:\n"""\n${s.selection}\n"""`)
  // The page can be long; the tail is usually boilerplate, the head is the teaching.
  if (s.page) parts.push(`Page content:\n"""\n${s.page.slice(0, 6000)}\n"""`)
  return parts.length === 0 ? '' : `PAGE CONTEXT\n${parts.join('\n\n')}\n\n---\n\n`
}

/** Server-sent events, the framing Gemini's streaming endpoint uses with
 *  alt=sse. Split on blank lines; keep a trailing partial event for the next
 *  chunk, since a JSON payload is routinely cut across reads. */
async function* sseData(res: Response, signal: AbortSignal): AsyncGenerator<string> {
  const reader = res.body?.getReader()
  if (!reader) return
  const decoder = new TextDecoder()
  let buf = ''
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done || signal.aborted) break
      buf += decoder.decode(value, { stream: true })
      let cut = buf.indexOf('\n\n')
      while (cut >= 0) {
        const event = buf.slice(0, cut)
        buf = buf.slice(cut + 2)
        for (const line of event.split('\n')) if (line.startsWith('data:')) yield line.slice(5).trim()
        cut = buf.indexOf('\n\n')
      }
    }
  } finally {
    void reader.cancel().catch(() => {})
  }
}

/** Streams one answer, yielding text deltas. */
export async function* streamAnswer(messages: Msg[], context: string, signal: AbortSignal): AsyncGenerator<string> {
  const key = getKey()
  if (key === '') throw new Error('No API key set.')

  // The UI appends an EMPTY model turn as a streaming placeholder before calling
  // this. Sending it makes the conversation end on a model turn, which Gemini
  // rejects with a 400 — so drop it here, where every caller routes through.
  const turns = messages.filter((m, i) => !(i === messages.length - 1 && m.role === 'model' && m.text === ''))

  // A non-Google key speaks the OpenAI wire format. Same turns, same context,
  // same streaming — only the envelope differs.
  const provider = providerFor(key)
  if (provider !== null) {
    const msgs = [
      { role: 'system', content: INSTRUCTION },
      ...turns.map((m, i) => ({
        role: m.role === 'model' ? 'assistant' : 'user',
        content: i === turns.length - 1 ? context + m.text : m.text,
      })),
    ]
    yield* streamOpenAI(provider, key, msgs, signal, sseData)
    return
  }

  // Context rides on the latest turn so it reflects the page they are on NOW,
  // not the page they were on when the conversation started.
  const contents = turns.map((m, i) => ({
    role: m.role,
    parts: [{ text: i === turns.length - 1 ? context + m.text : m.text }],
  }))

  let res: Response
  try {
    res = await request(`/models/${MODEL}:streamGenerateContent&alt=sse`, key, transportFor(key), {
      method: 'POST',
      body: JSON.stringify({ contents, systemInstruction: { parts: [{ text: INSTRUCTION }] } }),
      signal,
    })
  } catch (e) {
    if (signal.aborted) return
    throw new Error(friendly(e))
  }

  if (!res.ok) throw new Error(friendly(new Error(await res.text())))

  for await (const data of sseData(res, signal)) {
    if (signal.aborted) return
    if (data === '' || data === '[DONE]') continue
    let parsed: { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    try {
      parsed = JSON.parse(data)
    } catch {
      continue // a keep-alive or a partial line; the next event carries the text
    }
    const text = parsed.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    if (text !== '') yield text
  }
}

/* ---------- error text ---------- */

/** Errors arrive as JSON, sometimes JSON wrapping more JSON. Dig out the
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
  // Google is migrating AI Studio to "AQ." auth keys and the REST API does not
  // accept them yet. Verified against the live endpoint on v1, v1beta and
  // v1alpha, across every transport.
  if (/ACCESS_TOKEN_TYPE_UNSUPPORTED|Expected OAuth 2 access token/i.test(hay))
    return 'Google rejected this key’s FORMAT, not the key itself. New "AQ." keys from AI Studio are not yet accepted by the Gemini REST API — a known, unresolved Google migration issue. Press "Test key" for the full detail.'
  if (/API key not valid|API_KEY_INVALID|API key expired/i.test(hay))
    return 'That API key was rejected by Google. Open the Key panel and paste a valid one.'
  if (/SERVICE_DISABLED|has not been used in project|PERMISSION_DENIED/i.test(hay))
    return 'The key is valid but the Gemini API is not enabled for it. Enable it in Google AI Studio.'
  if (/RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(hay)) return 'Rate limit or quota hit. Wait a minute and ask again.'
  if (/not found|NOT_FOUND|is not supported/i.test(hay)) return `Model unavailable for this key: ${hay}`
  if (/Failed to fetch|NetworkError|ERR_NAME|ERR_INTERNET/i.test(hay))
    return 'Could not reach Google. Check your connection.'
  return hay
}
