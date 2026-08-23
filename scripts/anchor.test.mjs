// The one check that matters for highlights: does an anchor still find its text
// after the page around it changes? resolveIndex is pure, so this needs no DOM.
//
//   node scripts/anchor.test.mjs
//
// ponytail: one assert-based file, no framework. It fails loudly if the fallback
// search regresses, which is the only way a saved highlight silently disappears.

import assert from 'node:assert/strict'
import { createJiti } from 'jiti'

const { resolveIndex } = await createJiti(import.meta.url, { interopDefault: true })
  .import('../src/lib/anchor.ts')

const A = 'Adam adds two moment buffers, so optimizer state is four times the model.'
const B = 'LoRA rank 8 trains 0.195% of the parameters.'
const C = 'A second mention of 0.195% appears further down.'

const anchor = { blockIndex: 1, start: 19, end: 26, text: '0.195%', prefix: 'rank 8 trains ' }
// The hint must actually be right for the fast-path case below to mean anything.
assert.equal(B.slice(19, 25), '0.195%')
const exact = { ...anchor, start: 19, end: 25 }

// 1. fast path: the hint is correct
assert.deepEqual(resolveIndex([A, B, C], exact), { i: 1, start: 19 })

// 2. a block was inserted above — index is stale, prefix rescues it
assert.deepEqual(resolveIndex(['new intro', A, B, C], exact), { i: 2, start: 19 })

// 3. the block was reworded around the phrase — prefix is gone, text alone finds it
const reworded = 'At rank 8 LoRA trains only 0.195% of the parameters, which is the headline.'
assert.deepEqual(resolveIndex([A, reworded, C], exact), { i: 1, start: reworded.indexOf('0.195%') })

// 4. the phrase repeats — the prefix must pick the ORIGINAL, not the first match
assert.deepEqual(resolveIndex([C, A, B], exact), { i: 2, start: 19 })

// 5. the text is gone entirely — no anchor, and no false positive
assert.equal(resolveIndex(['nothing', 'relevant'], exact), null)

// 6. an empty anchor never matches (it would otherwise match at 0 everywhere)
assert.equal(resolveIndex([A], { ...exact, text: '' }), null)

console.log('anchor: 6 checks passed')
