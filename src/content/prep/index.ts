import { mod, type SubjectDef } from '../types'

export const prep: SubjectDef = {
  id: 'prep',
  title: 'Interview Prep & Portfolio',
  short: 'PREP',
  why: 'The last two months. You stop learning topics and start converting knowledge into performance.',
  prereqs: ['dsa', 'sysdesign'],
  levelTitles: ['Portfolio', 'The rounds nobody studies for', 'The final grind', ''],
  interviewThemes: [
    'Walk me through a project on your resume',
    'Tell me about a conflict with a teammate',
    'Tell me about a time you failed',
    'How did you know your project actually worked',
    'Map your stories to Amazon Leadership Principles',
    'Design your own project for 1M users',
  ],
  mindmapMarkdown: `- Interview Prep & Portfolio
  - Capstones (plan §5)
    - Mini-GPT
    - Full MLOps pipeline
    - RAG study-buddy + eval harness
    - Scalable API design doc
  - Project as story
    - Resume line: what, number, stack
    - 2-minute walkthrough
    - Depth on anything you list
  - Behavioral (STAR)
    - Situation / Task / Action / Result
    - Eight stories, "I" not "we"
    - Conflict, failure, leadership
    - Ambiguity, deadline, learning
    - Feedback, would-do-differently
    - Survive three follow-ups
  - Company research
    - Google: DSA + Googleyness
    - Meta: speed + product sense
    - Amazon: Leadership Principles
    - Ask the recruiter
  - The final grind
    - 2 timed DSA/day
    - 2 design mocks/week, 45-min
    - Interview mode: random 20
    - Review queue: 1-3-7-21-60
    - Weekly blank-page recall test`,
  modules: [
    mod('prep-l0-capstones', 0, 'The Four Capstones: Your Portfolio Is Your Interview Story', 60, () => import('./l0-capstones')),
    mod('prep-l1-behavioral-star', 1, 'Behavioral Interviews: Eight STAR Stories From Your Own Work', 55, () => import('./l1-behavioral-star')),
    mod('prep-l1-company-research', 1, 'Company Research: Google, Meta & Amazon', 45, () => import('./l1-company-research')),
    mod('prep-l2-mock-protocol', 2, 'The Final Two Months: Mocks, Timed Practice & Revision Cadence', 55, () => import('./l2-mock-protocol')),
  ],
}
