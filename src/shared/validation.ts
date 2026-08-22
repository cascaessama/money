/** Valida se o texto é uma data real no formato dd/mm/aaaa. */
export function isValidDateBR(value: string): boolean {
  const m = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(value.trim())
  if (!m) return false
  const day = +m[1]
  const month = +m[2]
  const year = 2000 + +m[3]
  const d = new Date(year, month - 1, day)
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  )
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Completa uma data parcial, usando a data atual para preencher o que faltar.
 * Apenas dois cenários são completados:
 *  - só o dia (ex.: "1" ou "10") → dia/mês atual/ano atual
 *  - dia/mês (ex.: "01/1") → dia/mês/ano atual
 * Outros valores (ex.: data com ano parcial) são retornados como estão.
 */
export function completeDateInput(value: string): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const parts = value.trim().split('/')

  // Apenas dia (ex.: "1" ou "10") → dia/mês atual/ano atual
  if (parts.length === 1 && parts[0]) {
    const day = parseInt(parts[0], 10)
    if (day >= 1 && day <= 31) {
      return `${pad2(day)}/${pad2(currentMonth)}/${pad2(currentYear % 100)}`
    }
    return value
  }

  // Dia/mês (ex.: "01/1") → ano atual
  if (parts.length === 2 && parts[0] && parts[1]) {
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10)
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${pad2(day)}/${pad2(month)}/${pad2(currentYear % 100)}`
    }
    return value
  }

  return value
}

/** Valida os dados de uma transação. Retorna mensagem de erro ou null. */
export function validateTransaction(input: {
  date: string
  amount: number
  wallet_id: number
  category_id: number
}): string | null {
  if (!input.date || !isValidDateBR(input.date)) {
    return 'Data inválida. Use o formato dd/mm/aaaa.'
  }
  if (typeof input.amount !== 'number' || !isFinite(input.amount)) {
    return 'Valor inválido.'
  }
  if (!input.wallet_id) return 'Selecione uma carteira.'
  if (!input.category_id) return 'Selecione uma categoria.'
  return null
}
