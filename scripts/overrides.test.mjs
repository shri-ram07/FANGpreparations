// applyOverrides is the only code that rewrites module content at runtime. The
// checks that matter: it picks the RIGHT copy of a repeated phrase, it never
// touches code or latex, and it never mutates the Module the registry cached.
//
//   node scripts/overrides.test.mjs

import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'

// overrides.ts imports '@/lib/anchor'; jiti does not read tsconfig paths.
const src = fileURLToPath(new URL('../src', import.meta.url))
const { applyOverrides } = await createJiti(import.meta.url, {
  interopDefault: true,
  alias: { '@': src },
}).import('../src/lib/chat/overrides.ts')

const base = () => ({
  id: 'ml-l1-agents',
  subjectId: 'ml',
  level: 1,
  title: 'Agents',
  whyItMatters: 'An agent is a loop that calls tools.',
  assumes: ['You know what an LLM is.'],
  sections: [
    { type: 'intuition', title: 'What an agent is', md: 'An agent is a loop that calls tools until done.' },
    { type: 'note', label: 'THE TRAP', md: 'People confuse an agent with a chatbot, but really it is a loop that calls tools.' },
    { type: 'code', lang: 'python', code: 'An agent is a loop that calls tools.' },
    { type: 'math', intro: 'The reward sums up.', latex: ['An agent is a loop that calls tools.'] },
  ],
  quiz: [],
  interviewQuestions: [],
  flashcards: [],
  mindmapMarkdown: '# Agents',
})

const ov = (o) => ({ id: 'o1', moduleId: 'ml-l1-agents', prefix: '', ...o })

// 1. plain replacement in a section body
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'a loop that calls tools until done', replace: 'a planner plus a tool caller' })])
  assert.equal(r.sections[0].md, 'An agent is a planner plus a tool caller.')
}

// 2. the original is NOT mutated — the registry caches this object
{
  const m = base()
  applyOverrides(m, [ov({ find: 'a loop that calls tools until done', replace: 'CHANGED' })])
  assert.equal(m.sections[0].md, 'An agent is a loop that calls tools until done.')
  assert.equal(m.whyItMatters, 'An agent is a loop that calls tools.')
}

// 3. the phrase repeats; the prefix must pick the copy the reader selected,
//    NOT the first one in reading order
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'a loop that calls tools', prefix: 'really it is ', replace: 'X' })])
  assert.equal(r.sections[1].md, 'People confuse an agent with a chatbot, but really it is X.')
  assert.equal(r.whyItMatters, 'An agent is a loop that calls tools.', 'the earlier copy must be left alone')
}

// 3b. same find with NO prefix falls back to first-in-order — whyItMatters
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'a loop that calls tools', replace: 'X' })])
  assert.equal(r.whyItMatters, 'An agent is X.')
}

// 4. code and latex are never rewritten, even though they contain the phrase
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'a loop that calls tools', replace: 'X' })])
  assert.equal(r.sections[2].code, 'An agent is a loop that calls tools.')
  assert.equal(r.sections[3].latex[0], 'An agent is a loop that calls tools.')
}

// 5. no match leaves the module alone, and returns it untouched rather than guessing
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'text that is simply not present', replace: 'X' })])
  assert.deepEqual(r, m)
}

// 6. an override for a different module is ignored
{
  const m = base()
  const r = applyOverrides(m, [{ id: 'o', moduleId: 'dl-l2-other', find: 'An agent', prefix: '', replace: 'X' }])
  assert.equal(r, m)
}

// 7. two overrides both land
{
  const m = base()
  const r = applyOverrides(m, [
    ov({ id: 'a', find: 'until done', replace: 'until the goal is met' }),
    ov({ id: 'b', find: 'confuse an agent with a chatbot', replace: 'confuse it with a chatbot' }),
  ])
  assert.equal(r.sections[0].md, 'An agent is a loop that calls tools until the goal is met.')
  assert.equal(r.sections[1].md, 'People confuse it with a chatbot, but really it is a loop that calls tools.')
}

// 8. headings (intuition.title / note.label) are replaceable too
{
  const m = base()
  const r = applyOverrides(m, [ov({ find: 'THE TRAP', replace: 'WATCH OUT' })])
  assert.equal(r.sections[1].label, 'WATCH OUT')
}

console.log('overrides: 9 checks passed')
