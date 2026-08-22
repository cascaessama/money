import { queryAll, run } from './connection'
import type { Wallet, WalletInput } from '../../shared/types'

interface WalletRow {
  id: number
  name: string
  type_id: number
  balance: number
  is_active: number
}

function toWallet(row: WalletRow): Wallet {
  return {
    id: row.id,
    name: row.name,
    type_id: row.type_id,
    balance: row.balance,
    is_active: !!row.is_active
  }
}

export function listWallets(): Wallet[] {
  const rows = queryAll<WalletRow>(
    'SELECT * FROM wallets ORDER BY name COLLATE NOCASE ASC'
  )
  return rows.map(toWallet)
}

export function createWallet(input: WalletInput): Wallet {
  const id = run(
    'INSERT INTO wallets (name, type_id, balance, is_active) VALUES (?, ?, ?, ?)',
    [
      input.name.trim(),
      input.type_id,
      input.balance || 0,
      input.is_active ? 1 : 0
    ]
  )
  const row = queryAll<WalletRow>('SELECT * FROM wallets WHERE id = ?', [id])[0]
  return toWallet(row)
}

export function updateWallet(
  id: number,
  input: WalletInput
): Wallet | undefined {
  run(
    `UPDATE wallets
     SET name = ?, type_id = ?, balance = ?, is_active = ?
     WHERE id = ?`,
    [
      input.name.trim(),
      input.type_id,
      input.balance || 0,
      input.is_active ? 1 : 0,
      id
    ]
  )
  const row = queryAll<WalletRow>('SELECT * FROM wallets WHERE id = ?', [id])[0]
  return row ? toWallet(row) : undefined
}

export function deleteWallet(id: number): boolean {
  const exists =
    queryAll<{ n: number }>('SELECT COUNT(*) AS n FROM wallets WHERE id = ?', [
      id
    ])[0].n > 0
  if (!exists) return false
  run('DELETE FROM wallets WHERE id = ?', [id])
  return true
}
