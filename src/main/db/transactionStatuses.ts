import { queryAll, run } from './connection'
import { AppError } from '../../shared/errors'
import type { TransactionStatus, TransactionStatusInput } from '../../shared/types'

interface TransactionStatusRow {
  id: number
  name: string
  is_active: number
  color: string | null
}

function toTransactionStatus(row: TransactionStatusRow): TransactionStatus {
  return {
    id: row.id,
    name: row.name,
    is_active: !!row.is_active,
    color: row.color
  }
}

export function listTransactionStatuses(): TransactionStatus[] {
  const rows = queryAll<TransactionStatusRow>(
    'SELECT * FROM transaction_statuses ORDER BY name COLLATE NOCASE ASC'
  )
  return rows.map(toTransactionStatus)
}

export function createTransactionStatus(
  input: TransactionStatusInput
): TransactionStatus {
  const id = run(
    'INSERT INTO transaction_statuses (name, is_active, color) VALUES (?, ?, ?)',
    [input.name.trim(), input.is_active ? 1 : 0, input.color]
  )
  const row = queryAll<TransactionStatusRow>(
    'SELECT * FROM transaction_statuses WHERE id = ?',
    [id]
  )[0]
  return toTransactionStatus(row)
}

export function updateTransactionStatus(
  id: number,
  input: TransactionStatusInput
): TransactionStatus | undefined {
  run(
    'UPDATE transaction_statuses SET name = ?, is_active = ?, color = ? WHERE id = ?',
    [input.name.trim(), input.is_active ? 1 : 0, input.color, id]
  )
  const row = queryAll<TransactionStatusRow>(
    'SELECT * FROM transaction_statuses WHERE id = ?',
    [id]
  )[0]
  return row ? toTransactionStatus(row) : undefined
}

export function deleteTransactionStatus(id: number): boolean {
  const exists =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM transaction_statuses WHERE id = ?',
      [id]
    )[0].n > 0
  if (!exists) return false

  // Impede excluir um status que esteja em uso por alguma transação.
  const inUse =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM transactions WHERE status_id = ?',
      [id]
    )[0].n > 0
  if (inUse) throw new Error(AppError.STATUS_IN_USE)

  run('DELETE FROM transaction_statuses WHERE id = ?', [id])
  return true
}
