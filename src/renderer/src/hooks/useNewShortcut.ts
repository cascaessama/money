import { useEffect, useRef } from 'react'

/**
 * Atalho de teclado global (Cmd/Ctrl + N) para criar um novo registro.
 * Usa uma ref para sempre chamar o handler mais recente sem re-registrar o
 * listener a cada render.
 */
export function useNewShortcut(handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler)
  handlerRef.current = handler

  useEffect(() => {
    if (!enabled) return
    const onKeyDown = (e: KeyboardEvent): void => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        handlerRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])
}
