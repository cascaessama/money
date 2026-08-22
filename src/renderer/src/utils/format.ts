/** Formatação de valores. */

export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Converte texto digitado (formato brasileiro) em número. */
export function parseMoney(value: string): number {
  const v = value.trim()
  if (!v) return 0
  const n = v.includes(',')
    ? parseFloat(v.replace(/\./g, '').replace(',', '.'))
    : parseFloat(v)
  return isNaN(n) ? 0 : n
}

/** Máscara de data dd/mm/aaaa: mantém dígitos e barras e insere barras automaticamente. */
export function formatDateInput(value: string): string {
  let v = value.replace(/[^\d/]/g, '').slice(0, 8)
  v = v.replace(/\/{2,}/g, '/')
  const insertSlash = (s: string, pos: number): string =>
    s.length > pos && s[pos] !== '/' ? s.slice(0, pos) + '/' + s.slice(pos) : s
  v = insertSlash(v, 2)
  v = insertSlash(v, 5)
  return v
}

/** Exibe um valor com 2 casas decimais no formato brasileiro. */
export function amountDisplay(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

/** Formata o valor digitado (2 casas decimais, vírgula) ao perder o foco. */
export function formatAmountBlur(value: string): string {
  const t = value.trim()
  if (!t) return value
  const n = parseMoney(t)
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}
