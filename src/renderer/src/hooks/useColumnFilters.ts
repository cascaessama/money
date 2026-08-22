import { useCallback, useState } from 'react'

type CustomMatch = (
  row: unknown,
  field: string,
  term: string
) => boolean | undefined

/**
 * Filtro de texto por coluna (case-insensitive) para telas de CRUD.
 * Mantém um termo de busca por campo e filtra as linhas em memória.
 * `customMatch` permite uma regra própria por campo (ex.: data).
 */
export function useColumnFilters(customMatch?: CustomMatch) {
  const [filters, setFilters] = useState<Record<string, string>>({})

  /** Define/limpa o termo de busca de um campo. */
  const setFilter = useCallback((field: string, value: string) => {
    setFilters((prev) => {
      const trimmed = value.trim()
      if (trimmed === '') {
        if (!(field in prev)) return prev
        const next = { ...prev }
        delete next[field]
        return next
      }
      return { ...prev, [field]: trimmed }
    })
  }, [])

  /** Aplica todos os filtros ativos às linhas. */
  const applyFilters = useCallback(
    <T,>(rows: T[], getText: (row: T, field: string) => string): T[] => {
      const entries = Object.entries(filters)
      if (entries.length === 0) return rows
      return rows.filter((row) =>
        entries.every(([field, term]) => {
          if (customMatch) {
            const custom = customMatch(row, field, term)
            if (custom !== undefined) return custom
          }
          return getText(row, field).toLowerCase().includes(term.toLowerCase())
        })
      )
    },
    [filters, customMatch]
  )

  const clearFilters = useCallback(() => setFilters({}), [])

  return { filters, setFilter, applyFilters, clearFilters }
}
