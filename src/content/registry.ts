import type { Module, ModuleEntry, SubjectDef, SubjectId } from './types'
import { python } from './python'
import { cpp } from './cpp'
import { dsa } from './dsa'
import { dbms } from './dbms'
import { backend } from './backend'
import { math } from './math'
import { ml } from './ml'
import { metrics } from './metrics'
import { dl } from './dl'
import { genai } from './genai'
import { mlops } from './mlops'
import { sysdesign } from './sysdesign'
import { prep } from './prep'

// Metadata layer only — this whole file (13 subjects' titles/themes/module
// lists) is a few KB and lives in the main chunk. Full module CONTENT loads
// per-module via entry.load(), each module its own chunk. Nothing outside a
// subject index.ts may statically import a content file.
export const SUBJECTS: SubjectDef[] = [python, cpp, dsa, dbms, backend, math, ml, metrics, dl, genai, mlops, sysdesign, prep]

export const subjectById = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, SubjectDef>

export function findModuleEntry(subjectId: string, moduleId: string): { subject: SubjectDef; entry: ModuleEntry } | null {
  const subject = (subjectById as Record<string, SubjectDef | undefined>)[subjectId]
  const entry = subject?.modules.find((m) => m.id === moduleId)
  return subject && entry ? { subject, entry } : null
}

const moduleIndex = new Map<string, { subject: SubjectDef; entry: ModuleEntry }>()
for (const s of SUBJECTS) for (const e of s.modules) moduleIndex.set(e.id, { subject: s, entry: e })

/** Reverse lookup by moduleId alone (review queue cards store only moduleId). */
export const findModule = (moduleId: string) => moduleIndex.get(moduleId) ?? null

const cache = new Map<string, Module>()

export async function loadModule(entry: ModuleEntry): Promise<Module> {
  let m = cache.get(entry.id)
  if (!m) {
    m = (await entry.load()).default
    if (import.meta.env.DEV && m.id !== entry.id) {
      throw new Error(`content drift: index registers '${entry.id}' but the file exports '${m.id}'`)
    }
    cache.set(entry.id, m)
  }
  return m
}
