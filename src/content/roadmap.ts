import type { SubjectId } from './types'

export interface Phase {
  n: number
  months: string
  focus: string
  outcome: string
  subjects: SubjectId[]
}

// MASTER_STUDY_PLAN §3 — the ~12-month phase timeline.
export const PHASES: Phase[] = [
  { n: 0, months: '0–1', focus: 'Python + OOP, Git, Linux basics, math intuition refresh', outcome: 'Fluent Python, comfortable terminal', subjects: ['python', 'math'] },
  { n: 1, months: '1–3', focus: 'C++ from scratch, DSA foundations, SQL basics', outcome: '100+ easy/medium problems solved', subjects: ['cpp', 'dsa', 'dbms'] },
  { n: 2, months: '3–5', focus: 'All ML algorithms + Metrics & Losses, DSA continues', outcome: '3 ML projects, Kaggle comfort', subjects: ['ml', 'metrics', 'dsa'] },
  { n: 3, months: '5–7', focus: 'Deep Learning + Backend (FastAPI), Docker basics', outcome: 'NN from scratch, deployed ML API', subjects: ['dl', 'backend'] },
  { n: 4, months: '7–9', focus: 'GenAI: transformer from scratch → LLM apps; MLOps practical', outcome: 'Your own mini-GPT, full MLOps pipeline', subjects: ['genai', 'mlops'] },
  { n: 5, months: '9–11', focus: 'System Design (HLD + LLD), advanced DSA, DBMS internals', outcome: 'Can design Instagram/Uber on a whiteboard', subjects: ['sysdesign', 'dsa', 'dbms'] },
  { n: 6, months: '11–12', focus: 'Interview grind: mocks, revision via mind maps, capstone polish', outcome: 'FAANG-ready', subjects: ['prep'] },
]

export const DAILY_RHYTHM = [
  '1.5 h — DSA: 1 new problem + 1 revision problem',
  '2–3 h — current phase subject',
  '30 min — spaced-repetition review queue (flashcards + mind maps)',
]

export const WEEKEND_RHYTHM = [
  'Half day — build the current project',
  'Half day — mock interview or contest (LeetCode weekly, Codeforces)',
]
