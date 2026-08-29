import type { ComponentProps } from 'react'
import type { visuals } from '@/components/visuals/registry'

export type SubjectId =
  | 'python'
  | 'cpp'
  | 'dsa'
  | 'dbms'
  | 'backend'
  | 'math'
  | 'ml'
  | 'metrics'
  | 'dl'
  | 'genai'
  | 'mlops'
  | 'sysdesign'
  | 'prep'

export type Level = 0 | 1 | 2 | 3

export type CodeLang = 'python' | 'cpp' | 'sql' | 'yaml' | 'bash'

/** The alternate-language half of a code section. */
export interface CodeVariant {
  code: string
  /** 1-based line number -> annotation, keyed to THIS variant's lines. */
  annotations?: Record<number, string>
}

/** Derived from the visuals registry: component key and props typecheck together in content files. */
export type VisualSection = {
  [K in keyof typeof visuals]: {
    type: 'visual'
    component: K
    props: ComponentProps<(typeof visuals)[K]>
  }
}[keyof typeof visuals]

export type Section =
  | { type: 'intuition'; title?: string; md: string }
  /** Hinglish intuition box — ONLY for plan-marked hard-concept zones. */
  | { type: 'hinglish'; md: string }
  /** Bordered callout. `label` names its job (THE TRAP, THE FORMULA); defaults to NOTE. */
  | { type: 'note'; md: string; label?: string }
  /** Collapsed "Show the math" expander; each latex entry renders display-mode. */
  | { type: 'math'; intro?: string; latex: string[] }
  | {
      type: 'code'
      lang: CodeLang
      code: string
      title?: string
      /** 1-based line number -> annotation shown on hover/click. */
      annotations?: Record<number, string>
      /** Python twin of the SAME algorithm. Its presence is what puts the
       *  cpp | py switch on the block; it carries its own annotations because
       *  the two variants never line up line for line. */
      py?: CodeVariant
    }
  | VisualSection

export interface MCQ {
  question: string
  /** Every option carries an explanation — shown as instant feedback whichever is picked. */
  options: { text: string; explanation: string }[]
  correct: number // index into options
}

export interface InterviewQ {
  question: string
  answer: string
  isCaseBased: boolean
}

export interface Flashcard {
  front: string
  back: string
}

export interface Module {
  id: string
  subjectId: SubjectId
  level: Level
  title: string
  whyItMatters: string
  /** Plain-language list of what the reader should already know, shown at the top
   *  of the page. Fixes the "term defined four modules later" problem. */
  assumes?: string[]
  estMinutes: number
  sections: Section[]
  quiz: MCQ[] // 5–10
  interviewQuestions: InterviewQ[] // 8–15, ≥2 case-based
  flashcards: Flashcard[] // 6–12
  /** Indented markdown outline -> markmap. */
  mindmapMarkdown: string
}

/**
 * Metadata layer — lives in the main chunk so lists/progress render without
 * loading content. `load` is a closure; the import() fires only when called.
 */
export interface ModuleEntry {
  id: string
  level: Level
  title: string
  estMinutes: number
  load: () => Promise<{ default: Module }>
}

export interface SubjectDef {
  id: SubjectId
  title: string
  /** 2–3 letter badge for the sidebar. */
  short: string
  /** One-line "why this subject" for the overview page. */
  why: string
  prereqs: SubjectId[]
  levelTitles: [string, string, string, string]
  interviewThemes: string[]
  /** Subject-level revision mind map (the plan's "Mind map nodes"). */
  mindmapMarkdown: string
  modules: ModuleEntry[]
}

/** One line per module in a subject index — the entire registration cost of a new module. */
export const mod = (
  id: string,
  level: Level,
  title: string,
  estMinutes: number,
  load: () => Promise<{ default: Module }>,
): ModuleEntry => ({ id, level, title, estMinutes, load })
