import { queryAll } from './connection'
import {
  REPORT_STATUS_NONE,
  type Transaction,
  type PeriodReport,
  type PeriodReportInput,
  type PeriodReportCategory,
  type PeriodReportStatus
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

/** Converte "dd/mm/yy" em "yymmdd" para comparação lexicográfica. */
function dateKey(dateStr: string): string {
  const [dd, mm, yy] = dateStr.split('/')
  return `${yy}${mm}${dd}`
}

/**
 * Relatório do período: total recebido/gasto, saldo, agrupamentos por
 * categoria e por status, e as transações do período.
 *
 * Convenção: amount > 0 = entrada (recebido); amount < 0 = saída (gasto).
 */
export function periodReport(input: PeriodReportInput): PeriodReport {
  const conditions: string[] = []
  const params: (string | number)[] = []

  if (input.category_id != null) {
    conditions.push('category_id = ?')
    params.push(input.category_id)
  }
  if (input.status_id === REPORT_STATUS_NONE) {
    conditions.push('status_id IS NULL')
  } else if (input.status_id != null) {
    conditions.push('status_id = ?')
    params.push(input.status_id)
  }
  if (input.date_start) {
    conditions.push(
      "substr(date,7,2) || substr(date,4,2) || substr(date,1,2) >= ?"
    )
    params.push(dateKey(input.date_start))
  }
  if (input.date_end) {
    conditions.push(
      "substr(date,7,2) || substr(date,4,2) || substr(date,1,2) <= ?"
    )
    params.push(dateKey(input.date_end))
  }

  // Categorias tratadas como transferência entre contas: ficam fora do
  // relatório de receitas/despesas (não são crédito nem débito).
  const TRANSFER_CATEGORY_NAMES = [
    'entre contas',
    'transferência',
    'transferencia'
  ]
  const transferRows = queryAll<{ id: number }>(
    `SELECT id FROM categories
     WHERE LOWER(TRIM(name)) IN (${TRANSFER_CATEGORY_NAMES.map(() => '?').join(',')})`,
    TRANSFER_CATEGORY_NAMES.map((n) => n.toLowerCase())
  )
  const transferIds = new Set(transferRows.map((r) => r.id))
  if (transferIds.size) {
    conditions.push(
      `category_id NOT IN (${[...transferIds].map(() => '?').join(',')})`
    )
    params.push(...transferIds)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const rows = queryAll<TransactionRow>(
    `SELECT * FROM transactions ${where}
     ORDER BY substr(date, 7, 2) DESC, substr(date, 4, 2) DESC,
              substr(date, 1, 2) DESC, id DESC`,
    params
  )

  const transactions: Transaction[] = rows.map((r) => ({
    id: r.id,
    date: r.date,
    amount: r.amount,
    wallet_id: r.wallet_id,
    category_id: r.category_id,
    notes: r.notes,
    status_id: r.status_id
  }))

  let totalReceived = 0
  let totalSpent = 0
  const catMap = new Map<number, { received: number; spent: number; count: number }>()
  const statusMap = new Map<number | null, { amount: number; count: number }>()

  for (const r of rows) {
    if (r.amount >= 0) totalReceived += r.amount
    else totalSpent += r.amount

    const c = catMap.get(r.category_id) ?? { received: 0, spent: 0, count: 0 }
    if (r.amount >= 0) c.received += r.amount
    else c.spent += r.amount
    c.count++
    catMap.set(r.category_id, c)

    const s = statusMap.get(r.status_id) ?? { amount: 0, count: 0 }
    s.amount += r.amount
    s.count++
    statusMap.set(r.status_id, s)
  }

  const byCategory: PeriodReportCategory[] = [...catMap.entries()]
    .map(([category_id, c]) => ({
      category_id,
      received: c.received,
      spent: c.spent,
      net: c.received + c.spent,
      count: c.count
    }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))

  const byStatus: PeriodReportStatus[] = [...statusMap.entries()].map(
    ([status_id, s]) => ({
      status_id,
      amount: s.amount,
      count: s.count
    })
  )

  return {
    total_received: totalReceived,
    total_spent: totalSpent,
    net: totalReceived + totalSpent,
    transaction_count: rows.length,
    by_category: byCategory,
    by_status: byStatus,
    transactions
  }
}
