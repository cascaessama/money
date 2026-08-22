import { queryAll, run } from './connection'
import { AppError } from '../../shared/errors'
import type { WalletType, WalletTypeInput } from '../../shared/types'

interface WalletTypeRow {
  id: number
  name: string
  is_active: number
}

function toWalletType(row: WalletTypeRow): WalletType {
  return {
    id: row.id,
    name: row.name,
    is_active: !!row.is_active
  }
}

export function listWalletTypes(): WalletType[] {
  const rows = queryAll<WalletTypeRow>(
    'SELECT * FROM wallets_types ORDER BY name COLLATE NOCASE ASC'
  )
  return rows.map(toWalletType)
}

export function createWalletType(input: WalletTypeInput): WalletType {
  const id = run('INSERT INTO wallets_types (name, is_active) VALUES (?, ?)', [
    input.name.trim(),
    input.is_active ? 1 : 0
  ])
  const row = queryAll<WalletTypeRow>('SELECT * FROM wallets_types WHERE id = ?', [
    id
  ])[0]
  return toWalletType(row)
}

export function updateWalletType(
  id: number,
  input: WalletTypeInput
): WalletType | undefined {
  run(
    'UPDATE wallets_types SET name = ?, is_active = ? WHERE id = ?',
    [input.name.trim(), input.is_active ? 1 : 0, id]
  )
  const row = queryAll<WalletTypeRow>('SELECT * FROM wallets_types WHERE id = ?', [
    id
  ])[0]
  return row ? toWalletType(row) : undefined
}

export function deleteWalletType(id: number): boolean {
  const type = queryAll<{ id: number; name: string }>(
    'SELECT id, name FROM wallets_types WHERE id = ?',
    [id]
  )[0]
  if (!type) return false

  // Impede excluir um tipo que esteja em uso por alguma carteira.
  const inUse =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM wallets WHERE type_id = ?',
      [id]
    )[0].n > 0
  if (inUse) {
    throw new Error(AppError.TYPE_IN_USE)
  }

  run('DELETE FROM wallets_types WHERE id = ?', [id])
  return true
}
