import { useCallback, useEffect, useState } from 'react'
import { useExcelGrid } from '../hooks/useExcelGrid'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { sortByName } from '../utils/sort'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { useNewShortcut } from '../hooks/useNewShortcut'
import { useRowHighlight } from '../hooks/useRowHighlight'
import ColumnFilter from '../components/ColumnFilter'
import type { TransactionStatus } from '../../../shared/types'

const api = window.api.transactionStatuses

const FIELDS = ['name', 'color', 'status']
const NEW_FIELDS = ['name', 'color']
const DEFAULT_COLOR = '#2d6cdf'

export default function TransactionStatusesScreen(): JSX.Element {
  const [rows, setRows] = useState<TransactionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNameFocused, setNewNameFocused] = useState(false)
  const [newColor, setNewColor] = useState(DEFAULT_COLOR)
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const { toast, showToast } = useToast()
  const { filters, setFilter, applyFilters, clearFilters } = useColumnFilters()
  const [highlightId, setHighlightId] = useState<number | null>(null)
  useRowHighlight(highlightId, setHighlightId)
  const visibleRows = applyFilters(rows, (row) => row.name)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await api.list())
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao carregar os dados.')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => {
    load()
  }, [load])

  const updateName = useCallback(
    async (id: number, name: string) => {
      const prev = rows.find((r) => r.id === id)
      if (!prev) return
      setBusyId(id)
      try {
        const updated = await api.update(id, {
          name,
          is_active: prev.is_active,
          color: prev.color
        })
        if (updated) {
          setRows((prevRows) =>
            prevRows.map((r) => (r.id === id ? updated : r)).sort(sortByName)
          )
          showToast('success', 'Registro atualizado.')
        }
      } catch (err) {
        console.error(err)
        if (String((err as any)?.message).includes('UNIQUE')) {
          showToast('error', 'Já existe um status com esse nome.')
        } else {
          showToast('error', 'Erro ao salvar o registro.')
        }
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [rows, showToast, load]
  )

  const onCommitNew = useCallback(async () => {
    const name = newName.trim()
    if (!name) {
      setCreating(false)
      return
    }
    setCreating(false)
    setBusyId('new')
    try {
      const created = await api.create({ name, is_active: true, color: newColor })
      setRows((prev) => [...prev, created].sort(sortByName))
      setHighlightId(created.id)
      showToast('success', 'Status criado.')
      return created.id
    } catch (err) {
      console.error(err)
      if (String((err as any)?.message).includes('UNIQUE')) {
        showToast('error', 'Já existe um status com esse nome.')
      } else {
        showToast('error', 'Erro ao criar o status.')
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }, [newName, newColor, showToast, load])

  const grid = useExcelGrid({
    fields: FIELDS,
    newFields: NEW_FIELDS,
    creating,
    rowKeys: visibleRows.map((r) => r.id),
    onCommitText: (rowKey, _field, value) => updateName(Number(rowKey), value),
    onCommitNew,
    onCancelNew: () => setCreating(false)
  })

  function startNew(): void {
    clearFilters()
    setNewName('')
    setNewColor(DEFAULT_COLOR)
    setCreating(true)
    grid.focusNewName()
  }

  useNewShortcut(() => {
    if (!creating) startNew()
  })

  async function toggleActive(row: TransactionStatus): Promise<void> {
    if (busyId !== null) return
    setBusyId(row.id)
    try {
      const updated = await api.update(row.id, {
        name: row.name,
        is_active: !row.is_active,
        color: row.color
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar o status.')
    } finally {
      setBusyId(null)
    }
  }

  async function changeColor(row: TransactionStatus, color: string): Promise<void> {
    if (busyId !== null) return
    setBusyId(row.id)
    try {
      const updated = await api.update(row.id, {
        name: row.name,
        is_active: row.is_active,
        color
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar a cor.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(row: TransactionStatus): Promise<void> {
    if (!window.confirm(`Excluir o status "${row.name}"?`)) return
    try {
      await api.remove(row.id)
      showToast('success', 'Status excluído.')
      await load()
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao excluir o registro.')
    }
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Status de Transação</h1>
          <div className="page-subtitle">
            Clique no nome para editar. Use Tab para ir ao próximo campo.
          </div>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={startNew}>
            <span>+</span> Novo status
          </button>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Status <span className="count-badge">{rows.length}</span>
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : rows.length === 0 && !creating ? (
          <div className="empty">
            <div className="empty-icon">📌</div>
            <h3>Nenhum status cadastrado</h3>
            <p>Clique em “Novo status” para começar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>
                    <div className="th-filter">
                      <span>Nome</span>
                      <ColumnFilter
                        value={filters.name ?? ''}
                        onChange={(v) => setFilter('name', v)}
                      />
                    </div>
                  </th>
                  <th>Cor</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {creating && (
                  <tr className="is-editing">
                    <td>
                      <input
                        ref={grid.registerCell('new:name')}
                        className={`cell-input ${newNameFocused ? 'is-editing' : ''}`}
                        placeholder="Ex.: Pago"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onFocus={() => setNewNameFocused(true)}
                        onBlur={() => {
                          setNewNameFocused(false)
                          grid.handleBlur('new:name')
                        }}
                        onKeyDown={grid.gridKeyDown('new:name')}
                      />
                    </td>
                    <td>
                      <input
                        ref={grid.registerCell('new:color')}
                        type="color"
                        className="color-input"
                        value={newColor}
                        onChange={(e) => setNewColor(e.target.value)}
                        onBlur={() => grid.handleBlur('new:color')}
                        onKeyDown={grid.gridKeyDown('new:color')}
                      />
                    </td>
                    <td>
                      <button
                        className="switch on"
                        tabIndex={-1}
                        aria-label="Ativo"
                        title="Ativo"
                      >
                        <span className="knob" />
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setCreating(false)}
                          disabled={busyId === 'new'}
                        >
                          Cancelar
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

                {visibleRows.length === 0 && !creating && (
                  <tr>
                    <td colSpan={4} className="table-empty">
                      🔍 Nenhum resultado — ajuste ou limpe a busca.
                    </td>
                  </tr>
                )}

                {visibleRows.map((row) => (
                  <tr
                    key={row.id}
                    data-row={row.id}
                    className={[
                      grid.editing?.cellKey?.startsWith(String(row.id) + ':')
                        ? 'is-editing'
                        : '',
                      row.id === highlightId ? 'is-new' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <td>{grid.textCell(row.id, 'name', row.name, 'Nome do status')}</td>
                    <td>
                      <input
                        ref={grid.registerCell(`${row.id}:color`)}
                        type="color"
                        className="color-input"
                        value={row.color ?? '#000000'}
                        onChange={(e) => changeColor(row, e.target.value)}
                        onKeyDown={grid.gridKeyDown(`${row.id}:color`)}
                        title="Escolher cor"
                      />
                    </td>
                    <td>
                      <button
                        ref={grid.registerCell(`${row.id}:status`)}
                        className={`switch ${row.is_active ? 'on' : ''}`}
                        onClick={() => toggleActive(row)}
                        aria-label="Alternar ativo"
                        title={row.is_active ? 'Ativo' : 'Inativo'}
                        onKeyDown={grid.gridKeyDown(`${row.id}:status`)}
                      >
                        <span className="knob" />
                      </button>
                    </td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => remove(row)}
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Toast toast={toast} />
    </div>
  )
}
