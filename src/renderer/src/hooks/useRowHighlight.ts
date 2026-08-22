import { useEffect } from 'react'

/**
 * Rola até a linha recém-criada (identificada por `data-row`) e a mantém
 * destacada por ~3s. `setHighlight` deve ser o setter estável do estado
 * (ex.: o próprio `setState` do useState) para não re-executar o efeito.
 */
export function useRowHighlight(
  highlightId: number | null,
  setHighlight: (id: number | null) => void
): void {
  useEffect(() => {
    if (highlightId == null) return
    const el = document.querySelector<HTMLElement>(
      `tr[data-row="${highlightId}"]`
    )
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = window.setTimeout(() => setHighlight(null), 3200)
    return () => window.clearTimeout(timer)
  }, [highlightId, setHighlight])
}
