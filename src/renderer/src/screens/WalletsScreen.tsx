import { useCallback, useEffect, useState } from 'react'
import { useExcelGrid } from '../hooks/useExcelGrid'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { formatCurrency } from '../utils/format'
import { sortByName } from '../utils/sort'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { useNewShortcut } from '../hooks/useNewShortcut'
import { useRowHighlight } from '../hooks/useRowHighlight'
import ColumnFilter from '../components/ColumnFilter'
import SearchableSelect, { toSelectOptions } from '../components/SearchableSelect'
import { isAppError, AppError } from '../../../shared/errors'
import type { Wallet, WalletType } from '../../../shared/types'

const api = window.api

const FIELDS = ['name', 'type', 'status']
const NEW_FIELDS = ['name', 'type']

export default function WalletsScreen(): JSX.Element {
  const [rows, setRows] = useState<Wallet[]>([])
  const [types, setTypes] = useState<WalletType[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState({ name: '', typeId: 0 })
  const [newNameFocused, setNewNameFocused] = useState(false)
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const { toast, showToast } = useToast()
  const { filters, setFilter, applyFilters, clearFilters } = useColumnFilters()
  const [highlightId, setHighlightId] = useState<number | null>(null)
  useRowHighlight(highlightId, setHighlightId)
  const visibleRows = applyFilters(rows, (row, field) =>
    field === 'type'
      ? types.find((t) => t.id === row.type_id)?.name ?? ''
      : String(row.name ?? '')
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wallets, walletTypes] = await Promise.all([
        api.wallets.list(),
        api.walletsTypes.list()
      ])
      setRows(wallets)
      setTypes(walletTypes)
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
        const updated = await api.wallets.update(id, {
          name,
          type_id: prev.type_id,
          balance: prev.balance,
          is_active: prev.is_active
        })
        if (updated) {
          setRows((prevRows) =>
            prevRows.map((r) => (r.id === id ? updated : r)).sort(sortByName)
          )
          showToast('success', 'Carteira atualizada.')
        }
      } catch (err) {
        console.error(err)
        showToast('error', 'Erro ao salvar a carteira.')
        await load()
      } finally {
        setBusyId(null)
      }
    },
    [rows, showToast, load]
  )

  const onCommitNew = useCallback(async () => {
    const name = newDraft.name.trim()
    if (!name || !newDraft.typeId) {
      setCreating(false)
      return
    }
    setCreating(false)
    setBusyId('new')
    try {
      const created = await api.wallets.create({
        name,
        type_id: newDraft.typeId,
        balance: 0,
        is_active: true
      })
      setRows((prev) => [...prev, created].sort(sortByName))
      setHighlightId(created.id)
      showToast('success', 'Carteira criada.')
      return created.id
    } catch (err) {
      console.error(err)
      if (String((err as any)?.message).includes('UNIQUE')) {
        showToast('error', 'Já existe uma carteira com esse nome.')
      } else {
        showToast('error', 'Erro ao criar a carteira.')
      }
      await load()
    } finally {
      setBusyId(null)
    }
  }, [newDraft, showToast, load])

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
    const firstType = types.find((t) => t.is_active)?.id ?? types[0]?.id ?? 0
    setNewDraft({ name: '', typeId: firstType })
    setCreating(true)
    grid.focusNewName()
  }

  useNewShortcut(() => {
    if (!creating) startNew()
  })

  async function changeType(row: Wallet, typeId: number): Promise<void> {
    if (busyId !== null) return
    setBusyId(row.id)
    try {
      const updated = await api.wallets.update(row.id, {
        name: row.name,
        type_id: typeId,
        balance: row.balance,
        is_active: row.is_active
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar o tipo.')
    } finally {
      setBusyId(null)
    }
  }

  async function toggleActive(row: Wallet): Promise<void> {
    if (busyId !== null) return
    setBusyId(row.id)
    try {
      const updated = await api.wallets.update(row.id, {
        name: row.name,
        type_id: row.type_id,
        balance: row.balance,
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

  async function remove(row: Wallet): Promise<void> {
    if (!window.confirm(`Excluir a carteira "${row.name}"?`)) return
    try {
      await api.wallets.remove(row.id)
      showToast('success', 'Carteira excluída.')
      await load()
    } catch (err) {
      console.error(err)
      if (isAppError(err, AppError.WALLET_IN_USE)) {
        showToast('error', 'Não é possível excluir: esta carteira está em uso em transações.')
      } else {
        showToast('error', 'Erro ao excluir a carteira.')
      }
    }
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Carteiras</h1>
          <div className="page-subtitle">
            Clique em uma célula para editar. Use Tab para ir ao próximo campo.
          </div>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={startNew}>
            <span>+</span> Nova carteira
          </button>
        )}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Carteiras <span className="count-badge">{rows.length}</span>
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : rows.length === 0 && !creating ? (
          <div className="empty">
            <div className="empty-icon">💳</div>
            <h3>Nenhuma carteira cadastrada</h3>
            <p>Clique em “Nova carteira” para começar.</p>
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
                  <th>
                    <div className="th-filter">
                      <span>Tipo</span>
                      <ColumnFilter
                        value={filters.type ?? ''}
                        onChange={(v) => setFilter('type', v)}
                      />
                    </div>
                  </th>
                  <th>Saldo</th>
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
                        placeholder="Ex.: Conta do dia a dia"
                        value={newDraft.name}
                        onChange={(e) =>
                          setNewDraft((d) => ({ ...d, name: e.target.value }))
                        }
                        onFocus={() => setNewNameFocused(true)}
                        onBlur={() => {
                          setNewNameFocused(false)
                          grid.handleBlur('new:name')
                        }}
                        onKeyDown={grid.gridKeyDown('new:name')}
                      />
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(types, null)}
                        value={newDraft.typeId || null}
                        onChange={(id) =>
                          setNewDraft((d) => ({ ...d, typeId: id ?? 0 }))
                        }
                        placeholder="Selecione…"
                        registerCell={grid.registerCell('new:type')}
                        onKeyDown={grid.gridKeyDown('new:type')}
                        onBlur={() => grid.handleBlur('new:type')}
                      />
                    </td>
                    <td>
                      <span className="balance">R$ 0,00</span>
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
                    <td colSpan={5} className="table-empty">
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
                    <td>{grid.textCell(row.id, 'name', row.name, 'Nome da carteira')}</td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(types, row.type_id)}
                        value={row.type_id}
                        onChange={(id) => changeType(row, id ?? 0)}
                        registerCell={grid.registerCell(`${row.id}:type`)}
                        onKeyDown={grid.gridKeyDown(`${row.id}:type`)}
                      />
                    </td>
                    <td>
                      <span className={`balance ${row.balance < 0 ? 'negative' : ''}`}>
                        {formatCurrency(row.balance)}
                      </span>
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
