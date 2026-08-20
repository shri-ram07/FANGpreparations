import { mod, type SubjectDef } from '../types'

export const cpp: SubjectDef = {
  id: 'cpp',
  title: 'C++',
  short: 'C++',
  why: 'The DSA language. Also proves systems depth (Google loves it).',
  prereqs: ['python'],
  levelTitles: ['Basics', 'Core', 'OOP + STL', 'Modern & Advanced'],
  interviewThemes: [
    'vtable mechanics',
    'unique_ptr vs shared_ptr',
    'What happens on push_back (amortized doubling)',
    'Deep vs shallow copy',
    'Explain RAII',
    'The diamond problem',
  ],
  mindmapMarkdown: `- C++
  - Memory
    - Stack vs heap
    - Pointers & references
    - new/delete → why raw new is dead
  - OOP & virtual
    - Constructors / destructors, Rule of 3 & 5
    - Virtual functions & vtables
    - Abstract classes, override/final
  - STL containers
    - vector, string, pair
    - map / unordered_map / set
    - stack, queue, priority_queue, deque
    - sort, lower_bound, custom comparators
  - Templates
    - Function & class templates
    - Lambdas
  - Smart pointers & RAII
    - unique_ptr / shared_ptr / weak_ptr
    - RAII — the single most important C++ idea
  - Modern C++
    - Move semantics & rvalue references
    - constexpr, auto, structured bindings`,
  modules: [
    mod('cpp-l0-compilation-basics', 0, 'What g++ Actually Does — Compilation, main & I/O', 45, () => import('./l0-compilation-basics')),
    mod('cpp-l0-functions-arrays', 0, 'Functions, Pass-by-Value vs Reference & Arrays', 40, () => import('./l0-functions-arrays')),
    mod('cpp-l1-pointers', 1, 'Pointers — the Full Story', 55, () => import('./l1-pointers')),
    mod('cpp-l1-references-memory', 1, 'References, new/delete & Stack vs Heap', 50, () => import('./l1-references-memory')),
    mod('cpp-l1-classes-rule-of-3', 1, 'Classes, Constructors & the Rule of 3', 50, () => import('./l1-classes-rule-of-3')),
    mod('cpp-l2-virtual-functions', 2, 'Inheritance, Virtual Functions & vtables', 55, () => import('./l2-virtual-functions')),
    mod('cpp-l2-operators-const', 2, 'Operator Overloading, friend & const-correctness', 40, () => import('./l2-operators-const')),
    mod('cpp-l2-stl', 2, 'STL Mastery — the DSA Toolkit', 70, () => import('./l2-stl')),
    mod('cpp-l2-templates-lambdas', 2, 'Templates & Lambdas', 45, () => import('./l2-templates-lambdas')),
    mod('cpp-l3-move-semantics', 3, 'Move Semantics, rvalue References & the Rule of 5', 55, () => import('./l3-move-semantics')),
    mod('cpp-l3-smart-pointers-raii', 3, 'RAII & Smart Pointers — Why Raw new Is Dead', 55, () => import('./l3-smart-pointers-raii')),
    mod('cpp-l3-modern-misc', 3, 'Modern C++ Toolkit & the Sharp Edges', 45, () => import('./l3-modern-misc')),
  ],
}
