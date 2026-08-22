import { queryAll, run, getDb, persist } from './connection'
import { validateTransaction } from '../../shared/validation'
import { AppError } from '../../shared/errors'
import type {
  Transaction,
  TransactionInput,
  MarkAsPaidInput
} from '../../shared/types'

interface TransactionRow {
  id: number
  date: string
  amount: number
  wallet_id: number
  category_id: number
  notes: string
  status_id: number | null
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    amount: row.amount,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    notes: row.notes,
    status_id: row.status_id
  }
}

export function listTransactions(): Transaction[] {
  const rows = queryAll<TransactionRow>(
    `SELECT * FROM transactions
     ORDER BY substr(date, 7, 2) DESC, substr(date, 4, 2) DESC, substr(date, 1, 2) DESC, id DESC`
  )
  return rows.map(toTransaction)
}

export function createTransaction(input: TransactionInput): Transaction {
  const validationError = validateTransaction(input)
  if (validationError) throw new Error(AppError.INVALID_DATA)
  const id = run(
    `INSERT INTO transactions
       (date, amount, wallet_id, category_id, notes, status_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.date,
      input.amount,
      input.wallet_id,
      input.category_id,
      input.notes,
      input.status_id
    ]
  )
  const row = queryAll<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [
    id
  ])[0]
  return toTransaction(row)
}

/** Cria várias transações de uma só vez (persistência única). */
export function createTransactions(inputs: TransactionInput[]): Transaction[] {
  if (!inputs.length) return []
  const db = getDb()
  const created: Transaction[] = []
  for (const input of inputs) {
    const validationError = validateTransaction(input)
    if (validationError) throw new Error(AppError.INVALID_DATA)
    db.run(
      `INSERT INTO transactions
         (date, amount, wallet_id, category_id, notes, status_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.date,
        input.amount,
        input.wallet_id,
        input.category_id,
        input.notes,
        input.status_id
      ]
    )
    const id = db.exec('SELECT last_insert_rowid() AS id')[0].values[0][0] as number
    created.push({
      id,
      date: input.date,
      amount: input.amount,
      wallet_id: input.wallet_id,
      category_id: input.category_id,
      notes: input.notes,
      status_id: input.status_id
    })
  }
  persist()
  return created
}

export function updateTransaction(
  id: number,
  input: TransactionInput
): Transaction | undefined {
  const validationError = validateTransaction(input)
  if (validationError) throw new Error(AppError.INVALID_DATA)
  run(
    `UPDATE transactions
     SET date = ?, amount = ?, wallet_id = ?, category_id = ?, notes = ?, status_id = ?
     WHERE id = ?`,
    [
      input.date,
      input.amount,
      input.wallet_id,
      input.category_id,
      input.notes,
      input.status_id,
      id
    ]
  )
  const row = queryAll<TransactionRow>('SELECT * FROM transactions WHERE id = ?', [
    id
  ])[0]
  return row ? toTransaction(row) : undefined
}

export function deleteTransaction(id: number): boolean {
  const exists =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM transactions WHERE id = ?',
      [id]
    )[0].n > 0
  if (!exists) return false
  run('DELETE FROM transactions WHERE id = ?', [id])
  return true
}

/** Marca como pagas todas as transações sem status de uma carteira. */
export function markTransactionsAsPaid(input: MarkAsPaidInput): number {
  run(
    `UPDATE transactions
     SET status_id = ?, date = ?
     WHERE wallet_id = ? AND status_id IS NULL`,
    [input.status_id, input.date, input.wallet_id]
  )
  const row = queryAll<{ n: number }>('SELECT changes() AS n')[0]
  return row ? row.n : 0
}
