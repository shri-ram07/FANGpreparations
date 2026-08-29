// Every DSA code block ships in both languages, and every line note points at a
// line that exists. tsc cannot see either fact — the twin is optional in the type
// and annotation keys are just numbers — so this is the only guard on 128 blocks.
//
//   node scripts/dsa-lang.test.mjs            # all DSA modules
//   node scripts/dsa-lang.test.mjs l2-trees   # one file, while translating it
//
// ponytail: assert-based, no framework, same shape as anchor.test.mjs.

import assert from 'node:assert/strict'
import { readdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createJiti } from 'jiti'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'dsa')
const only = process.argv[2]
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts')
  .filter((f) => !only || f.includes(only))
  .sort()

assert.ok(files.length > 0, `no DSA content files matched ${only ?? '*'}`)

const jiti = createJiti(import.meta.url, { interopDefault: true })
const pythonSources = []
const twins = []
let blocks = 0

for (const file of files) {
  const mod = await jiti.import(join(dir, file))
  const sections = (mod.default ?? mod).sections
  assert.ok(Array.isArray(sections), `${file}: no sections array`)

  sections.forEach((s, i) => {
    if (s.type !== 'code') return
    blocks++
    const at = `${file} section ${i} (${s.title ?? 'untitled'})`

    // 1. Every C++ block has a Python twin — that is the whole point of the toggle.
    if (s.lang === 'cpp') {
      assert.ok(s.py, `${at}: cpp block with no Python twin`)
      assert.ok(typeof s.py.code === 'string' && s.py.code.trim() !== '', `${at}: empty py.code`)
      assert.notEqual(s.py.code, s.code, `${at}: py.code is byte-identical to the C++`)
      // 2. Notes were translated too, not just the code.
      if (Object.keys(s.annotations ?? {}).length > 0) {
        assert.ok(Object.keys(s.py.annotations ?? {}).length > 0, `${at}: C++ has line notes, Python has none`)
      }
      pythonSources.push([at, s.py.code])
      twins.push({ mod: (mod.default ?? mod).id, i, title: s.title ?? '', py: s.py.code })
    } else {
      // A twin only makes sense against C++; anything else means a mis-set lang.
      assert.equal(s.py, undefined, `${at}: py twin on a non-cpp block (lang: ${s.lang})`)
    }

    // 3. Every annotation key is a real line of the variant it belongs to.
    checkNotes(at + ' [cpp]', s.code, s.annotations)
    if (s.py) checkNotes(at + ' [py]', s.py.code, s.py.annotations)
  })
}

function checkNotes(at, code, notes = {}) {
  const lines = code.split('\n').length
  for (const k of Object.keys(notes)) {
    const n = Number(k)
    assert.ok(Number.isInteger(n) && n >= 1 && n <= lines, `${at}: note on line ${k}, but the code has ${lines} lines`)
    assert.ok(String(notes[k]).trim() !== '', `${at}: empty note on line ${k}`)
  }
}

// 4. The Python actually parses. compile() needs syntax only, so snippets that
// reference undefined helpers (ListNode, a caller's array) still pass — this
// catches indentation, brackets and f-strings, the likely defects in hand-translation.
const PY = ['python3', 'python', 'py'].find((c) => spawnSync(c, ['-c', 'pass']).status === 0)
if (PY) {
  for (const [at, src] of pythonSources) {
    const r = spawnSync(PY, ['-c', 'import sys;compile(sys.stdin.read(),"<block>","exec")'], { input: src })
    assert.equal(r.status, 0, `${at}: Python does not parse\n${r.stderr}`)
  }
  console.log(`dsa-lang: ${blocks} code blocks, ${pythonSources.length} Python twins parsed by ${PY}`)

  // Parsing is not correctness. Hand the twins to the behaviour suite, which
  // runs each module's blocks cumulatively and drives every function against a
  // known answer — including the results the modules' own comments claim.
  const tmp = join(tmpdir(), 'dsa-twins.json')
  writeFileSync(tmp, JSON.stringify(twins))
  const beh = spawnSync(PY, [join(dirname(fileURLToPath(import.meta.url)), 'dsa-behaviour.py'), tmp], { encoding: 'utf8' })
  process.stdout.write(beh.stdout ?? '')
  assert.equal(beh.status, 0, `behaviour suite failed:
${beh.stderr}`)
} else {
  console.log(`dsa-lang: ${blocks} code blocks OK (no python on PATH — syntax check skipped)`)
}
