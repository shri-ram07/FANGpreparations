import type { SubjectId } from './types'

// Hand-laid positions for the /subjects dependency map (viewBox 720×740).
// Layout mirrors MASTER_STUDY_PLAN §2: ground floor on top, three tracks below,
// then the interview-prep layer at the bottom — it depends on everything above.
export const NODE_W = 148
export const NODE_H = 58

export const GRAPH_POS: Record<SubjectId, { x: number; y: number }> = {
  python: { x: 265, y: 40 },
  math: { x: 455, y: 40 },
  cpp: { x: 110, y: 170 },
  dsa: { x: 110, y: 300 },
  ml: { x: 360, y: 170 },
  metrics: { x: 360, y: 300 },
  dl: { x: 360, y: 430 },
  genai: { x: 360, y: 555 },
  dbms: { x: 600, y: 170 },
  backend: { x: 600, y: 300 },
  mlops: { x: 520, y: 430 },
  sysdesign: { x: 620, y: 555 },
  prep: { x: 286, y: 665 },
}

export const TRACK_LABELS: { text: string; x: number; y: number }[] = [
  { text: 'Track A · problem solving (daily, forever)', x: 110, y: 120 },
  { text: 'Track B · AI core', x: 360, y: 120 },
  { text: 'Track C · engineering', x: 600, y: 120 },
  { text: 'Final layer · everything above becomes the story', x: 286, y: 622 },
]
