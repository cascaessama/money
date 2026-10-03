/**
 * Percentuais que fecham exatamente em 100%.
 *
 * Arredondar cada linha de forma independente faz a soma "não fechar"
 * (ex.: 99,0% + 0,5% + 0,4% = 99,9%). O método do maior resto arredonda
 * para baixo e distribui a diferença entre os maiores restos, garantindo
 * que a soma das partes dê exatamente 100%.
 *
 * @param values   valores brutos (a soma deve ser > 0)
 * @param decimals casas decimais do percentual (padrão 1)
 */
export function percentagesTo100(values: number[], decimals = 1): number[] {
  const total = values.reduce((s, v) => s + v, 0)
  if (total <= 0) return values.map(() => 0)

  const factor = 10 ** decimals
  const target = 100 * factor
  const units = values.map((v) => (v / total) * target)
  const result = units.map(Math.floor)

  let missing = Math.round(target - result.reduce((s, v) => s + v, 0))
  const byRemainder = units
    .map((u, i) => ({ i, frac: u - Math.floor(u) }))
    .sort((a, b) => b.frac - a.frac)

  for (let k = 0; missing > 0 && k < byRemainder.length; k++) {
    result[byRemainder[k].i] += 1
    missing--
  }

  return result.map((u) => u / factor)
}

/** Formata um percentual já calculado (ex.: 99, 0.6), omitindo o ",0" final. */
export function formatPercent(pct: number, decimals = 1): string {
  const s = pct.toFixed(decimals).replace('.', ',')
  return s.endsWith(',0') ? `${s.slice(0, -2)}%` : `${s}%`
}
