import { mod, type SubjectDef } from '../types'

export const backend: SubjectDef = {
  id: 'backend',
  title: 'Backend (Python)',
  short: 'BE',
  why: 'ML engineers who can ship APIs are 10× more hirable. Feeds MLOps and System Design.',
  prereqs: ['python', 'dbms'],
  levelTitles: ['Web fundamentals', 'First APIs (FastAPI)', 'Real backend', 'Production'],
  interviewThemes: [
    'REST design of a resource',
    'JWT vs session tradeoffs',
    'The N+1 query problem',
    'Idempotency',
    'How would you serve a model at 1000 req/s',
  ],
  mindmapMarkdown: `- Backend (Python)
  - HTTP anatomy
    - DNS → TCP → request/response
    - Methods, status codes, headers
  - REST / CRUD
    - Resources & routes
    - Pydantic validation
  - Auth flows
    - Sessions vs JWT
    - Password hashing, OAuth idea
  - Async model
    - Event loop, async/await
    - When async helps — and when it doesn't
  - Data layer & caching
    - SQLAlchemy ORM
    - Redis, rate limiting, pagination
  - Serving ML
    - Load-at-startup, batching
    - Streaming responses (SSE / websockets)`,
  modules: [
    mod('backend-l0-web-fundamentals', 0, 'How the Internet Works: One Request, End to End', 50, () => import('./l0-web-fundamentals')),
    mod('backend-l1-fastapi-basics', 1, 'FastAPI: Routes, Pydantic & Your First CRUD API', 55, () => import('./l1-fastapi-basics')),
    mod('backend-l1-databases-orm', 1, 'Talking to Databases: SQLAlchemy, Sessions & the N+1 Trap', 55, () => import('./l1-databases-orm')),
    mod('backend-l2-auth', 2, 'Auth: Sessions vs JWT, Hashing & OAuth', 55, () => import('./l2-auth')),
    mod('backend-l2-async-python', 2, 'Async Python Properly: The Event Loop', 55, () => import('./l2-async-python')),
    mod('backend-l2-production-patterns', 2, 'Production Patterns: Middleware, Caching, Rate Limits & Testing', 60, () => import('./l2-production-patterns')),
    mod('backend-l3-serving-ml', 3, 'Production Serving: Workers, Queues, Streaming & ML APIs', 60, () => import('./l3-serving-ml')),
  ],
}
