import type { Transaction } from '../../../shared/types'
import { APP_CONFIG } from '../../../shared/config'

const dateValue = (d: string): number => {
  const [day, month, year] = d.split('/').map(Number)
  const fullYear = year < 100 ? APP_CONFIG.centuryBase + year : year
  return fullYear * 10000 + month * 100 + day
}

export const sortByDateDesc = (a: Transaction, b: Transaction): number =>
  dateValue(b.date) - dateValue(a.date) || b.id - a.id

/**
 * Filtro de data: 1–2 dígitos = dia; mm/yy = mês; 4 dígitos = ano.
 */
function matchesDateFilter(term: string, dateStr: string): boolean {
  const t = term.trim()
  if (!t) return true
  const [dd, mm, yy] = dateStr.split('/').map((s) => parseInt(s, 10))
  const fullYear = APP_CONFIG.centuryBase + yy

  // mm/yy ou mm/yyyy (mês/ano)
  const mmYY = /^(\d{1,2})\/(\d{2,4})$/.exec(t)
  if (mmYY) {
    const m = parseInt(mmYY[1], 10)
    const y = parseInt(mmYY[2], 10)
    if (m >= 1 && m <= 12) {
      const yTarget = y >= 100 ? y % 100 : y
      return mm === m && yy === yTarget
    }
    return dateStr.includes(t)
  }

  // Apenas dígitos
  if (/^\d+$/.test(t)) {
    if (t.length >= 4) {
      return fullYear === parseInt(t, 10)
    }
    if (t.length === 1 || t.length === 2) {
      return dd === parseInt(t, 10)
    }
  }

  return dateStr.includes(t)
}

// Matcher customizado usado pelo useColumnFilters (apenas no campo 'date').
export const dateMatcher = (
  row: unknown,
  field: string,
  term: string
): boolean | undefined => {
  if (field !== 'date') return undefined
  return matchesDateFilter(term, (row as Transaction).date)
}
