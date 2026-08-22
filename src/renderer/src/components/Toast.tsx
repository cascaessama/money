import type { ToastState } from '../hooks/useToast'

export function Toast({ toast }: { toast: ToastState | null }): JSX.Element | null {
  if (!toast) return null
  return (
    <div className={`toast show ${toast.type}`}>
      <span>{toast.type === 'success' ? '✓' : '✕'}</span>
      {toast.text}
    </div>
  )
}
