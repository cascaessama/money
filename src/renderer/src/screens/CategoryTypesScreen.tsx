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
import { isAppError, AppError } from '../../../shared/errors'
import type { CategoryType } from '../../../shared/types'

const api = window.api.categoriesTypes

const FIELDS = ['name', 'status']
const NEW_FIELDS = ['name']

export default function CategoryTypesScreen(): JSX.Element {
  const [rows, setRows] = useState<CategoryType[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNameFocused, setNewNameFocused] = useState(false)
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
          is_active: prev.is_active
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
          showToast('error', 'Já existe um tipo com esse nome.')
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
      const created = await api.create({ name, is_active: true })
      setRows((prev) => [...prev, created].sort(sortByName))
      setHighlightId(created.id)
      showToast('success', 'Tipo criado.')
      return created.id
    } catch (err) {
      console.error(err)
      if (String((err as any)?.message).includes('UNIQUE')) {
        showToast('error', 'Já existe um tipo com esse nome.')
      } else {
        showToast('error', 'Erro ao criar o tipo.')
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }, [newName, showToast, load])

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
    setCreating(true)
    grid.focusNewName()
  }

  useNewShortcut(() => {
    if (!creating) startNew()
  })

  async function toggleActive(row: CategoryType): Promise<void> {
    if (busyId !== null) return
    setBusyId(row.id)
    try {
      const updated = await api.update(row.id, {
        name: row.name,
        is_active: !row.is_active
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

  async function remove(row: CategoryType): Promise<void> {
    if (!window.confirm(`Excluir o tipo "${row.name}"?`)) return
    try {
      await api.remove(row.id)
      showToast('success', 'Tipo excluído.')
      await load()
    } catch (err) {
      console.error(err)
      if (isAppError(err, AppError.CATEGORY_TYPE_IN_USE)) {
        showToast('error', 'Não é possível excluir: este tipo está associado a uma categoria.')
      } else {
        showToast('error', 'Erro ao excluir o registro.')
      }
    }
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Tipos de Categoria</h1>
          <div className="page-subtitle">
            Clique no nome para editar. Use Tab para ir ao próximo campo.
          </div>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={startNew}>
            <span>+</span> Novo tipo
          </button>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Tipos <span className="count-badge">{rows.length}</span>
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : rows.length === 0 && !creating ? (
          <div className="empty">
            <div className="empty-icon">🏷️</div>
            <h3>Nenhum tipo cadastrado</h3>
            <p>Clique em “Novo tipo” para começar.</p>
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
                        placeholder="Ex.: Necessário"
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
                    <td colSpan={3} className="table-empty">
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
                    <td>{grid.textCell(row.id, 'name', row.name, 'Nome do tipo')}</td>
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
