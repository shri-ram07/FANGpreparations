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
  /** Tried in order; the first the key can actually use is remembered. */
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
export const setModel = (m: string) => localStorage.setItem(MODEL_ENTRY, m)
export const clearModel = () => localStorage.removeItem(MODEL_ENTRY)

const headers = (key: string) => ({ Authorization: `Bearer ${key}`, 'content-type': 'application/json' })

const bodyFor = (model: string, messages: { role: string; content: string }[], stream: boolean) =>
  JSON.stringify({ model, messages, stream, ...(stream ? {} : { max_tokens: 1 }) })

/** Find a model this key may actually call, and remember it. Returns the report
 *  line plus whether anything worked. */
export async function probeProvider(p: Provider, key: string): Promise<{ ok: boolean; lines: string[] }> {
  const lines: string[] = []
  for (const model of p.models) {
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
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: headers(key),
    body: bodyFor(getModel(p), messages, true),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    let msg = text.slice(0, 200)
    try {
      msg = JSON.parse(text)?.error?.message ?? msg
    } catch {
      /* not JSON — keep the raw body */
    }
    throw new Error(`${p.label}: ${msg}`)
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
