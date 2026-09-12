// Any OpenAI-compatible chat API, so a reader who cannot get a working Gemini
// key is not locked out.
//
// This exists because Google's AI Studio now issues "AQ." keys that its own REST
// API rejects, with no fix and no way for a reader to get the old "AIza" format.
// Groq, OpenRouter and Cerebras hand out working free keys in a minute, all speak
// the same wire format, and all three send permissive CORS headers — verified
// against their live endpoints, since a browser cannot call an API that does not.

const MODEL_ENTRY = 'faang-prep-chat-model'

export interface Provider {
  id: string
  label: string
  base: string
  /** Preferred model ids, best first. Only a HINT: providers retire models
   *  without notice (Groq dropped llama-3.3-70b-versatile), so the real list is
   *  fetched from the provider and these are used only to rank it. */
  models: string[]
  match: (key: string) => boolean
  signup: string
}

export const PROVIDERS: Provider[] = [
  {
    id: 'groq',
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'],
    match: (k) => k.startsWith('gsk_'),
    signup: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    base: 'https://openrouter.ai/api/v1',
    models: ['meta-llama/llama-3.3-70b-instruct:free', 'google/gemini-2.0-flash-exp:free'],
    match: (k) => k.startsWith('sk-or-'),
    signup: 'https://openrouter.ai/keys',
  },
  {
    id: 'cerebras',
    label: 'Cerebras',
    base: 'https://api.cerebras.ai/v1',
    models: ['llama-3.3-70b', 'llama3.1-8b'],
    match: (k) => k.startsWith('csk-'),
    signup: 'https://cloud.cerebras.ai',
  },
]

export const providerFor = (key: string): Provider | null => PROVIDERS.find((p) => p.match(key.trim())) ?? null

export const getModel = (p: Provider): string => localStorage.getItem(MODEL_ENTRY) ?? p.models[0]!

/** Models that answer chat completions. A provider's list also carries speech,
 *  embedding, moderation and guard models, which 404 or error on this endpoint. */
const NOT_CHAT = /whisper|tts|embed|guard|moderat|rerank|bge-|distil-whisper|playai/i

/** Ask the provider what it actually offers, best candidate first. Falls back to
 *  the compiled-in hints if the list cannot be read. */
export async function listModels(p: Provider, key: string): Promise<string[]> {
  let ids: string[] = []
  try {
    const res = await fetch(`${p.base}/models`, { headers: { Authorization: `Bearer ${key}` } })
    if (res.ok) {
      const data: unknown = await res.json()
      ids = ((data as { data?: { id?: unknown }[] }).data ?? [])
        .map((m) => (typeof m.id === 'string' ? m.id : ''))
        .filter((id) => id !== '' && !NOT_CHAT.test(id))
    }
  } catch {
    /* offline or blocked — fall through to the hints */
  }
  if (ids.length === 0) return p.models

  // Rank: a preferred id first, then bigger instruct-style models, then the rest.
  const score = (id: string) => {
    const pref = p.models.indexOf(id)
    if (pref >= 0) return 1000 - pref
    let n = 0
    if (/free/i.test(id)) n += 40
    if (/instruct|chat|versatile|instant/i.test(id)) n += 20
    if (/70b|72b|120b/i.test(id)) n += 15
    else if (/[389]b|8x7b/i.test(id)) n += 8
    if (/llama|qwen|gemma|mistral|gpt-oss/i.test(id)) n += 10
    if (/preview|alpha|beta|deprecated/i.test(id)) n -= 10
    return n
  }
  return [...ids].sort((a, b) => score(b) - score(a))
}
export const setModel = (m: string) => localStorage.setItem(MODEL_ENTRY, m)
export const clearModel = () => localStorage.removeItem(MODEL_ENTRY)

const headers = (key: string) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' })

const bodyFor = (model: string, messages: { role: string; content: string }[], stream: boolean) =>
  JSON.stringify({ model, messages, stream, ...(stream ? {} : { max_tokens: 1 }) })

/** Find a model this key may actually call, and remember it. Returns the report
 *  line plus whether anything worked. */
export async function probeProvider(p: Provider, key: string): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = []
  const candidates = (await listModels(p, key)).slice(0, 4)
  lines.push(`${p.label} offers ${candidates.length > 0 ? candidates.join(', ') : '(no model list)'}`)
  for (const model of candidates) {
    let res: Response
    try {
      res = await fetch(`${p.base}/chat/completions`, {
        method: 'POST',
        headers: headers(key),
        body: bodyFor(model, [{ role: 'user', content: 'hi' }], false),
      })
    } catch (e) {
      lines.push(`${model}: could not reach ${p.label} (${e instanceof Error ? e.message : String(e)})`)
      continue
    }
    if (res.ok) {
      setModel(model)
      lines.push(`${model}: OK`)
      return { ok: true, lines }
    }
    const text = await res.text()
    let msg = text.slice(0, 160)
    try {
      msg = JSON.parse(text)?.error?.message ?? msg
    } catch {
      /* not JSON — keep the raw body */
    }
    lines.push(`${model}: HTTP ${res.status} — ${msg}`)
  }
  return { ok: false, lines }
}

/** Streams one answer from an OpenAI-compatible endpoint. Yields text deltas. */
export async function* streamOpenAI(
  p: Provider,
  key: string,
  messages: { role: string; content: string }[],
  signal: AbortSignal,
  sse: (res: Response, signal: AbortSignal) => AsyncGenerator<string>,
): AsyncGenerator<string> {
  const send = (model: string) =>
    fetch(`${p.base}/chat/completions`, {
      method: 'POST',
      headers: headers(key),
      body: bodyFor(model, messages, true),
      signal,
    })

  const readError = async (res: Response) => {
    const text = await res.text()
    try {
      return String(JSON.parse(text)?.error?.message ?? text.slice(0, 200))
    } catch {
      return text.slice(0, 200)
    }
  }

  let res = await send(getModel(p))

  // Providers retire models without notice, and a stored choice then fails every
  // message until someone reruns the key test. Re-pick once, silently, instead.
  if (!res.ok) {
    const first = await readError(res)
    if (/does not exist|not found|decommission|deprecat|no access|invalid.*model/i.test(first)) {
      clearModel()
      const next = (await listModels(p, key))[0]
      if (next !== undefined && next !== '') {
        setModel(next)
        res = await send(next)
      }
    }
    if (!res.ok) throw new Error(`${p.label}: ${res.bodyUsed ? first : await readError(res)}`)
  }
  for await (const data of sse(res, signal)) {
    if (signal.aborted) return
    if (data === '' || data === '[DONE]') continue
    try {
      const delta = JSON.parse(data)?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta !== '') yield delta
    } catch {
      /* keep-alive or a split line; the next event carries the text */
    }
  }
}
