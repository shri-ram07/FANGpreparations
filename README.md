# FAANG Preparations

An interactive, single-user study site covering the full FAANG-interview curriculum —
**157 modules across 13 subjects**, built as a frontend-only React app with no backend
and no accounts. All progress lives in `localStorage`.

**Live:** https://shri-ram07.github.io/FANGpreparations/

## What's in it

| Track | Subjects |
| --- | --- |
| Foundations | Python + OOP, C++, Math for ML |
| Problem solving | DSA (20 modules) |
| Engineering | DBMS + SQL, Backend (Python), DevOps + MLOps, System Design (22 modules) |
| AI core | Machine Learning, Metrics & Losses, Deep Learning, GenAI & Transformers |
| Final layer | Interview Prep & Portfolio (capstones, STAR stories, company research, mock cadence) |

Every module carries at least one hand-built interactive, a quiz with per-option
explanations, 9–12 interview questions (several case-based), flashcards, and a
one-screen mind map.

## The learning system

- **Spaced repetition** — completing a module spawns flashcards on an SM-2-lite
  ladder (1 → 3 → 7 → 21 → 60 days). Interview questions you flag as "couldn't
  answer" join the same queue.
- **Interview mode** — a random draw of 20 questions across everything you've
  finished, with a subject filter.
- **Revision mode** — browse the mind maps of everything learned, or take the
  weekly recall test: reconstruct one map on a blank page from memory, then
  compare against the real one side by side.
- **Playgrounds** — real SQLite in the browser via sql.js (two seeded databases,
  64 exercises checked against a fresh DB), and real Python via Pyodide, click-gated
  with a precomputed-output fallback.
- **Progress** — streaks, per-subject progress, and JSON export/import so a
  schema change never wipes your history.

## Built with

Vite · React 18 · TypeScript (strict) · Tailwind v4 · react-router v7 · zustand
(persist + migrations) · shiki · KaTeX · markmap · sql.js · Pyodide.

Roughly 30 interactive visualisations are hand-built in SVG/Canvas — no chart
library, no UI kit.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds with
`BASE_PATH=/FANGpreparations/` and publishes to GitHub Pages. Because Pages has no
SPA rewrite, the build ships `index.html` as `404.html` so deep links resolve.

## Content structure

Content is pure data, not JSX. One folder per subject, one file per module, all
satisfying the `Module` interface in [`src/content/types.ts`](src/content/types.ts).
Adding a module is one new file plus one `mod(...)` line in that subject's
`index.ts` — no component changes.

The curriculum follows [`MASTER_STUDY_PLAN.md`](MASTER_STUDY_PLAN.md), which is the
source of truth for what gets taught and in what order.
