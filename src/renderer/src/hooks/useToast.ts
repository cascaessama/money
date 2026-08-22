import { useCallback, useEffect, useState } from 'react'

export type ToastType = 'success' | 'error'

export interface ToastState {
  type: ToastType
  text: string
}

/** Gerencia o estado de um toast (mensagem de feedback). */
export function useToast(autoHideMs = 2600) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((type: ToastType, text: string) => {
    setToast({ type, text })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), autoHideMs)
    return () => clearTimeout(t)
  }, [toast, autoHideMs])

  return { toast, showToast }
}
