import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import initSqlJs from 'sql.js'
import type { Database, SqlJsStatic, Statement, SqlValue } from 'sql.js'

let SQL: SqlJsStatic
let db: Database
let dbPath: string

/** Inicializa o SQL (WASM) e abre o banco do disco (ou cria um novo). */
export async function initConnection(): Promise<void> {
  SQL = await initSqlJs()
  dbPath = join(app.getPath('userData'), 'money.db')

  if (existsSync(dbPath)) {
    db = new SQL.Database(readFileSync(dbPath))
  } else {
    db = new SQL.Database()
  }
}

/** Acesso ao objeto Database para comandos DDL/migração. */
export function getDb(): Database {
  return db
}

/** Persiste o banco em memória para o arquivo em disco. */
export function persist(): void {
  const data = db.export()
  writeFileSync(dbPath, Buffer.from(data))
}

/** Executa uma consulta e devolve todas as linhas como objetos. */
export function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt: Statement = db.prepare(sql)
  stmt.bind(params)
  const results: T[] = []
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T)
  }
  stmt.free()
  return results
}

/** Executa um comando (INSERT/UPDATE/DELETE) e persiste o arquivo.
 *  Retorna o last_insert_rowid capturado ANTES do persist (o db.export()
 *  zera esse valor para 0). */
export function run(sql: string, params: SqlValue[] = []): number {
  const stmt: Statement = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  const lastId = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
  stmt.free()
  persist()
  return lastId
}

/** Exporta o banco (em memória) para um arquivo de destino. */
export function exportBackup(destPath: string): void {
  const data = db.export()
  writeFileSync(destPath, Buffer.from(data))
}

/** Restaura o banco a partir de um arquivo de backup (valida antes de aplicar). */
export function importBackup(srcPath: string): void {
  const src = readFileSync(srcPath)
  try {
    const check = new SQL.Database(src)
    const tables = check.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='transactions'"
    )
    const ok = tables.length > 0 && tables[0].values.length > 0
    check.close()
    if (!ok) throw new Error('INVALID_BACKUP')
  } catch {
    throw new Error('INVALID_BACKUP')
  }
  writeFileSync(dbPath, src)
}
