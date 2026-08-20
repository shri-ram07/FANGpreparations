import { mod, type SubjectDef } from '../types'

export const python: SubjectDef = {
  id: 'python',
  title: 'Python + OOP',
  short: 'PY',
  why: "Every AI/ML line of code you'll ever write. FAANG ML interviews often include a Python round.",
  prereqs: [],
  levelTitles: ['Fundamentals', 'Intermediate', 'OOP (full depth)', 'Advanced'],
  interviewThemes: [
    'The mutable default argument bug',
    "'is' vs '==' — identity vs equality",
    'MRO output questions',
    'Implement an LRU cache class',
    'Generator memory advantage',
    'Why composition over inheritance',
  ],
  mindmapMarkdown: `- Python + OOP
  - Data structures
    - list / tuple / set / dict — when to use which
    - Comprehensions & slicing
  - Functions
    - *args / **kwargs
    - lambda, map / filter / sorted(key=)
    - Iterators vs generators (yield)
  - OOP 4 pillars
    - Encapsulation & Abstraction
    - Inheritance (single / multiple / MRO)
    - Polymorphism
  - Dunders
    - __init__, __str__ vs __repr__
    - __eq__, __len__, __getitem__, __call__
  - Decorators & Generators
    - Closures
    - Context managers (with)
  - Memory & GIL
    - Reference counting, garbage collection
    - threading vs multiprocessing vs asyncio`,
  modules: [
    mod('py-l0-variables-and-flow', 0, 'Variables, Types & Control Flow', 45, () => import('./l0-variables-and-flow')),
    mod('py-l0-functions', 0, 'Functions, Scope & *args/**kwargs', 45, () => import('./l0-functions')),
    mod('py-l0-collections', 0, 'The Big Four Collections — and When to Use Which', 60, () => import('./l0-collections')),
    mod('py-l1-files-exceptions-modules', 1, 'Files, Exceptions & Project Hygiene', 50, () => import('./l1-files-exceptions-modules')),
    mod('py-l1-iterators-generators', 1, 'Iterators, Generators & the Lazy Toolbox', 50, () => import('./l1-iterators-generators')),
    mod('py-l1-mutability-traps', 1, 'Mutability, Copies & the Classic Traps', 45, () => import('./l1-mutability-traps')),
    mod('py-l2-oop-pillars', 2, 'Classes & the Four Pillars', 60, () => import('./l2-oop-pillars')),
    mod('py-l2-dunders-design', 2, 'Dunders, Properties & Object Design', 55, () => import('./l2-dunders-design')),
    mod('py-l3-decorators-context', 3, 'Decorators, Closures & Context Managers', 55, () => import('./l3-decorators-context')),
    mod('py-l3-typing-dataclasses', 3, 'Type Hints & Dataclasses', 40, () => import('./l3-typing-dataclasses')),
    mod('py-l3-concurrency-memory', 3, 'GIL, Concurrency & Memory', 55, () => import('./l3-concurrency-memory')),
  ],
}
