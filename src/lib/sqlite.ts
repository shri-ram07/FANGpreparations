// sql.js glue — lives inside the /playground/sql route chunk (this module is
// only imported from there). The .wasm ships as a hashed asset via ?url.
import type { Database, SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
import ecommerceSql from '@/data/sql/ecommerce.sql?raw'
import employeesSql from '@/data/sql/employees.sql?raw'

const SOURCES = { ecommerce: ecommerceSql, employees: employeesSql } as const
export type DbName = keyof typeof SOURCES

let sqlP: Promise<SqlJsStatic> | null = null
const dbs = new Map<DbName, Database>()

function getSql(): Promise<SqlJsStatic> {
  return (sqlP ??= import('sql.js').then((m) => m.default({ locateFile: () => wasmUrl })))
}

/** The user's session DB — persists mutations until resetDb. */
export async function getDb(name: DbName): Promise<Database> {
  const SQL = await getSql()
  let db = dbs.get(name)
  if (!db) {
    db = new SQL.Database()
    db.run(SOURCES[name])
    dbs.set(name, db)
  }
  return db
}

/** Users can DROP TABLE — reset re-seeds from the SQL text. */
export async function resetDb(name: DbName): Promise<Database> {
  dbs.get(name)?.close()
  dbs.delete(name)
  return getDb(name)
}

/** A pristine throwaway instance — exercise checking runs solutions here so a
 *  mutated session DB can never make a correct answer "wrong". */
export async function freshDb(name: DbName): Promise<Database> {
  const SQL = await getSql()
  const db = new SQL.Database()
  db.run(SOURCES[name])
  return db
}
