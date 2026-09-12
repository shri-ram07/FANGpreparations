// Error mapping is what turns a real failure into a useful sentence. It once
// mapped EVERY 400 to "bad key", which sent a reader hunting for a key problem
// that did not exist while the real fault was a malformed request.
//
//   node scripts/chat-errors.test.mjs

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

const src = fileURLToPath(new URL('../src', import.meta.url))
const { friendly } = await createJiti(import.meta.url, { interopDefault: true, alias: { '@': src } })
  .import('../src/lib/chat/gemini.ts')

// The shape the SDK actually throws: JSON wrapping more JSON. Captured from a
// real ApiError, not invented.
const apiError = (msg, status = 'INVALID_ARGUMENT', reason = '') =>
  new Error(
    JSON.stringify({
      error: {
        message: JSON.stringify({ error: { code: 400, message: msg, status, details: [{ reason }] } }, null, 2),
      },
    }),
  )

// 1. a genuinely bad key says so
assert.match(friendly(apiError('API key not valid. Please pass a valid API key.', 'INVALID_ARGUMENT', 'API_KEY_INVALID')), /rejected by Google/)

// 2. a MALFORMED REQUEST is also a 400 — it must NOT be reported as a key problem
const malformed = friendly(apiError('Please ensure that the number of function response parts is equal to the number of function call parts.'))
assert.doesNotMatch(malformed, /key/i, `a non-key 400 must not mention the key: ${malformed}`)
assert.match(malformed, /function response parts/)

// 3. the contents error the empty-model-turn bug produced is reported verbatim
const badTurn = friendly(apiError('Please use a valid role: user, model.'))
assert.doesNotMatch(badTurn, /key/i)
assert.match(badTurn, /valid role/)

// 4. quota and API-not-enabled are distinguished from a bad key
assert.match(friendly(apiError('Quota exceeded', 'RESOURCE_EXHAUSTED')), /Rate limit or quota/)
assert.match(friendly(apiError('Generative Language API has not been used in project 123 before')), /not enabled/)

// 5. a wrong model id reads as a model problem, not a key problem
const nomodel = friendly(apiError('models/gemini-9-flash is not found for API version v1beta', 'NOT_FOUND'))
assert.match(nomodel, /Model unavailable/)

// 6. a plain network failure is not dressed up as an API error
assert.match(friendly(new TypeError('Failed to fetch')), /Could not reach Google/)

console.log('chat-errors: 9 checks passed')
