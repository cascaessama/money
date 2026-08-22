import { useState } from 'react'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'

const api = window.api

export default function BackupScreen(): JSX.Element {
  const { toast, showToast } = useToast()
  const [busy, setBusy] = useState(false)

  async function handleExport(): Promise<void> {
    setBusy(true)
    try {
      const res = await api.backup.export()
      if (!res.canceled && res.filePath) {
        showToast('success', `Backup exportado em ${res.filePath}`)
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao exportar o backup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleImport(): Promise<void> {
    setBusy(true)
    try {
      const res = await api.backup.import()
      if (!res.canceled) {
        showToast('success', 'Backup restaurado.')
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao importar o backup. Verifique se o arquivo é válido.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Backup</h1>
          <div className="page-subtitle">
            Exporte ou restaure seu banco de dados.
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '18px' }}>
        <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
          Seu banco fica em{' '}
          <code>~/Library/Application Support/money/money.db</code>. Exporte um
          backup para um local seguro (ex.: HD externo, iCloud, Dropbox) e use-o
          para restaurar caso formate o computador.
        </p>
        <div
          className="report-actions-buttons"
          style={{ justifyContent: 'flex-start' }}
        >
          <button
            className="btn btn-primary"
            onClick={handleExport}
            disabled={busy}
          >
            {busy ? 'Processando…' : '💾 Exportar backup'}
          </button>
          <button className="btn btn-ghost" onClick={handleImport} disabled={busy}>
            {busy ? 'Processando…' : '📥 Importar backup'}
          </button>
        </div>
      </div>

      <Toast toast={toast} />
    </div>
  )
}
