import { mod, type SubjectDef } from '../types'

export const dbms: SubjectDef = {
  id: 'dbms',
  title: 'DBMS + SQL',
  short: 'DB',
  why: 'Guaranteed interview topic + the foundation for backend and system design.',
  prereqs: ['python'],
  levelTitles: ['Concepts', 'SQL (hands-on)', 'Design & theory', 'Internals & scale'],
  interviewThemes: [
    'Joins output prediction',
    'WHERE vs HAVING',
    '2nd highest salary — 4 ways',
    'ACID with real examples',
    'Why B+ tree',
    'Isolation-level scenarios',
    'Design the schema for X',
  ],
  mindmapMarkdown: `- DBMS + SQL
  - Keys & ER
    - Primary / foreign / candidate keys
    - ER model → relational model
  - SQL query anatomy
    - SELECT-WHERE-GROUP-HAVING-ORDER
    - Subqueries & CTEs
  - Joins
    - Inner / left / right / full
    - Self & cross joins
  - Window functions
    - ROW_NUMBER, RANK, DENSE_RANK
    - LAG / LEAD, running totals
  - Normalization ladder
    - 1NF → 2NF → 3NF → BCNF
    - When to denormalize
  - ACID & concurrency
    - Dirty / non-repeatable / phantom reads
    - Isolation levels, locks, deadlocks
  - Indexes & internals
    - B-tree vs B+ tree
    - Query plans, EXPLAIN, WAL`,
  modules: [
    mod('dbms-l0-dbms-er-keys', 0, 'DBMS, ER Modeling & Keys', 50, () => import('./l0-dbms-er-keys')),
    mod('dbms-l1-sql-core', 1, 'SQL Core: SELECT Anatomy, GROUP BY & HAVING', 60, () => import('./l1-sql-core')),
    mod('dbms-l1-joins', 1, 'Joins: Every Kind, Row by Row', 55, () => import('./l1-joins')),
    mod('dbms-l1-subqueries-ctes', 1, 'Subqueries, CTEs & Views', 45, () => import('./l1-subqueries-ctes')),
    mod('dbms-l1-window-functions', 1, 'Window Functions: Where FAANG SQL Rounds Live', 55, () => import('./l1-window-functions')),
    mod('dbms-l2-normalization', 2, "Normalization: 1NF → BCNF, One Table's Journey", 55, () => import('./l2-normalization')),
    mod('dbms-l2-transactions', 2, 'Transactions, ACID & Isolation Levels', 55, () => import('./l2-transactions')),
    mod('dbms-l2-indexing', 2, 'Indexing: B+ Trees, Clustered & Composite', 55, () => import('./l2-indexing')),
    mod('dbms-l3-query-execution', 3, 'Inside the Engine: Plans, Pages, Buffer Pool & WAL', 45, () => import('./l3-query-execution')),
    mod('dbms-l3-sql-vs-nosql-scale', 3, 'SQL vs NoSQL & Scaling the Data Layer', 50, () => import('./l3-sql-vs-nosql-scale')),
  ],
}
