import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useExcelGrid } from '../hooks/useExcelGrid'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import {
  parseMoney,
  formatDateInput,
  formatCurrency,
  amountDisplay,
  formatAmountBlur
} from '../utils/format'
import { dateMatcher } from '../utils/dateFilter'
import { isValidDateBR, completeDateInput } from '../../../shared/validation'
import { APP_CONFIG } from '../../../shared/config'
import { useColumnFilters } from '../hooks/useColumnFilters'
import { useNewShortcut } from '../hooks/useNewShortcut'
import { useRowHighlight } from '../hooks/useRowHighlight'
import ColumnFilter from '../components/ColumnFilter'
import SearchableSelect, { toSelectOptions } from '../components/SearchableSelect'
import type {
  Transaction,
  TransactionInput,
  Wallet,
  Category,
  TransactionStatus
} from '../../../shared/types'

const api = window.api

const FIELDS = ['date', 'amount', 'wallet', 'category', 'notes', 'status']
const NEW_FIELDS = ['date', 'amount', 'wallet', 'category', 'notes', 'status']
const TEXT_FIELDS = ['date', 'amount', 'notes']

const PAGE_SIZE = APP_CONFIG.pageSize

export default function TransactionsScreen(): JSX.Element {
  const [rows, setRows] = useState<Transaction[]>([])
  const rowsRef = useRef(rows)
  rowsRef.current = rows
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<TransactionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newDraft, setNewDraft] = useState({
    date: '',
    amount: '',
    walletId: 0,
    categoryId: 0,
    statusId: 0,
    notes: ''
  })
  const [busyId, setBusyId] = useState<number | 'new' | null>(null)
  const { toast, showToast } = useToast()
  const { filters, setFilter, applyFilters, clearFilters } = useColumnFilters(
    dateMatcher
  )
  const [page, setPage] = useState(1)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<number>>(new Set())

  const activeStatuses = statuses.filter((s) => s.is_active)

  // Converte uma linha no texto usado pelos filtros de coluna.
  const getFieldText = useCallback(
    (row: Transaction, field: string): string => {
      if (field === 'wallet')
        return wallets.find((w) => w.id === row.wallet_id)?.name ?? ''
      if (field === 'category')
        return categories.find((c) => c.id === row.category_id)?.name ?? ''
      if (field === 'status')
        return statuses.find((s) => s.id === row.status_id)?.name ?? ''
      if (field === 'notes') return row.notes ?? ''
      if (field === 'date') return row.date
      if (field === 'amount') return amountDisplay(row.amount)
      return ''
    },
    [wallets, categories, statuses]
  )

  const baseFiltered = applyFilters(rows, getFieldText)
  // Exclui os status marcados na caixa de segmentação.
  const filtered = baseFiltered.filter(
    (t) => t.status_id == null || !hiddenStatuses.has(t.status_id)
  )
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const activeWallets = wallets.filter((w) => w.is_active)
  const totalBalance = activeWallets.reduce((sum, w) => sum + w.balance, 0)

  // Ao mudar os filtros ou os status segmentados, volta para a primeira página.
  useEffect(() => {
    setPage(1)
  }, [filters, hiddenStatuses])

  useRowHighlight(highlightId, setHighlightId)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [transactions, walletList, categoryList, statusList] =
        await Promise.all([
          api.transactions.list(),
          api.wallets.list(),
          api.categories.list(),
          api.transactionStatuses.list()
        ])
      setRows(transactions)
      setWallets(walletList)
      setCategories(categoryList)
      setStatuses(statusList)
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

  const refreshWallets = useCallback(async () => {
    try {
      setWallets(await api.wallets.list())
    } catch (err) {
      console.error(err)
    }
  }, [])

  const inputOf = (row: Transaction): TransactionInput => ({
    date: row.date,
    amount: row.amount,
    wallet_id: row.wallet_id,
    category_id: row.category_id,
    notes: row.notes,
    status_id: row.status_id
  })

  const updateField = useCallback(
    async (id: number, field: string, value: string) => {
      const prev = rows.find((r) => r.id === id)
      if (!prev) return
      const next = inputOf(prev)
      if (field === 'date') {
        const completed = completeDateInput(value)
        if (!isValidDateBR(completed)) {
          showToast('error', 'Data inválida. Use o formato dd/mm/aaaa.')
          return
        }
        next.date = completed
      } else if (field === 'amount') {
        next.amount = parseMoney(value)
      } else if (field === 'notes') {
        next.notes = value
      }
      setBusyId(id)
      try {
        const updated = await api.transactions.update(id, next)
        if (updated) {
          setRows((prevRows) =>
            prevRows.map((r) => (r.id === id ? updated : r))
          )
          refreshWallets()
          showToast('success', 'Transação atualizada.')
        }
      } catch (err) {
        console.error(err)
        showToast('error', 'Erro ao salvar a transação.')
      } finally {
        setBusyId(null)
      }
    },
    [rows, showToast, refreshWallets]
  )

  const onCommitNew = useCallback(async () => {
    const date = completeDateInput(newDraft.date.trim())
    const amount = parseMoney(newDraft.amount)
    if (!date) {
      setCreating(false)
      return
    }
    if (!isValidDateBR(date)) {
      showToast('error', 'Data inválida. Use o formato dd/mm/aaaa.')
      return
    }
    if (!newDraft.walletId) {
      showToast('error', 'Selecione uma carteira.')
      return
    }
    if (!newDraft.categoryId) {
      showToast('error', 'Selecione uma categoria.')
      return
    }
    setCreating(false)
    setBusyId('new')
    try {
      const created = await api.transactions.create({
        date,
        amount,
        wallet_id: newDraft.walletId,
        category_id: newDraft.categoryId,
        notes: newDraft.notes.trim(),
        status_id: newDraft.statusId || null
      })
      // Sem reordenar a lista: apenas adiciona o novo registro no topo.
      const updatedRows = [created, ...rows]
      // Se o status do novo registro estiver oculto na segmentação,
      // reexibe-o para que o registro fique visível e possa ser destacado.
      let effectiveHidden = hiddenStatuses
      if (
        created.status_id != null &&
        hiddenStatuses.has(created.status_id)
      ) {
        effectiveHidden = new Set(hiddenStatuses)
        effectiveHidden.delete(created.status_id)
        setHiddenStatuses(effectiveHidden)
      }
      setRows(updatedRows)
      // Calcula a página com a mesma filtragem exibida na tela,
      // para garantir que o registro novo apareça nela.
      const visibleNew = applyFilters(updatedRows, getFieldText).filter(
        (t) => t.status_id == null || !effectiveHidden.has(t.status_id)
      )
      const createdIndex = visibleNew.findIndex((r) => r.id === created.id)
      if (createdIndex >= 0) {
        setPage(Math.floor(createdIndex / PAGE_SIZE) + 1)
      }
      setHighlightId(created.id)
      refreshWallets()
      showToast('success', 'Transação criada.')
      return created.id
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao criar a transação.')
      await load()
    } finally {
      setBusyId(null)
    }
  }, [
    newDraft,
    rows,
    showToast,
    load,
    refreshWallets,
    applyFilters,
    getFieldText,
    hiddenStatuses
  ])

  const grid = useExcelGrid({
    fields: FIELDS,
    newFields: NEW_FIELDS,
    textFields: TEXT_FIELDS,
    creating,
    rowKeys: pageRows.map((r) => r.id),
    onCommitText: (rowKey, field, value) =>
      updateField(Number(rowKey), field, value),
    onCommitNew,
    onCancelNew: () => setCreating(false)
  })

  function startNew(): void {
    clearFilters()
    setNewDraft({
      date: '',
      amount: '',
      walletId: 0,
      categoryId: 0,
      statusId: 0,
      notes: ''
    })
    setCreating(true)
    grid.focusNewName()
  }

  useNewShortcut(() => {
    if (!creating) startNew()
  })

  function toggleStatusFilter(statusId: number): void {
    setHiddenStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(statusId)) next.delete(statusId)
      else next.add(statusId)
      return next
    })
  }

  async function changeWallet(row: Transaction, walletId: number): Promise<void> {
    const latest = rowsRef.current.find((r) => r.id === row.id) ?? row
    setBusyId(row.id)
    try {
      const updated = await api.transactions.update(row.id, {
        ...inputOf(latest),
        wallet_id: walletId
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
        refreshWallets()
        showToast('success', 'Carteira atualizada.')
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar a carteira.')
    } finally {
      setBusyId(null)
    }
  }

  async function changeCategory(row: Transaction, categoryId: number): Promise<void> {
    const latest = rowsRef.current.find((r) => r.id === row.id) ?? row
    setBusyId(row.id)
    try {
      const updated = await api.transactions.update(row.id, {
        ...inputOf(latest),
        category_id: categoryId
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
        showToast('success', 'Categoria atualizada.')
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar a categoria.')
    } finally {
      setBusyId(null)
    }
  }

  async function changeStatus(
    row: Transaction,
    statusId: number | null
  ): Promise<void> {
    const latest = rowsRef.current.find((r) => r.id === row.id) ?? row
    setBusyId(row.id)
    try {
      const updated = await api.transactions.update(row.id, {
        ...inputOf(latest),
        status_id: statusId || null
      })
      if (updated) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? updated : r)))
        refreshWallets()
        showToast('success', 'Status atualizado.')
      }
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao atualizar o status.')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(row: Transaction): Promise<void> {
    if (!window.confirm('Excluir esta transação?')) return
    try {
      await api.transactions.remove(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      refreshWallets()
      showToast('success', 'Transação excluída.')
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao excluir a transação.')
    }
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Transações</h1>
          <div className="page-subtitle">
            Clique em uma célula para editar. Use Tab para ir ao próximo campo.
          </div>
        </div>
        {!creating && (
          <button className="btn btn-primary" onClick={startNew}>
            <span>+</span> Nova transação
          </button>
        )}
      </div>

      <div className="wallet-summary">
        {activeWallets.map((w) => (
          <div key={w.id} className="wallet-card">
            <span className="wallet-card-name">{w.name}</span>
            <span
              className={`wallet-card-balance ${w.balance < 0 ? 'negative' : ''}`}
            >
              {formatCurrency(w.balance)}
            </span>
          </div>
        ))}
        <div className="wallet-card total">
          <span className="wallet-card-name">Total</span>
          <span
            className={`wallet-card-balance ${totalBalance < 0 ? 'negative' : ''}`}
          >
            {formatCurrency(totalBalance)}
          </span>
        </div>
      </div>

      <div className="status-filter">
        {activeStatuses.map((s) => (
          <button
            key={s.id}
            className={`status-chip ${hiddenStatuses.has(s.id) ? 'hidden' : ''}`}
            onClick={() => toggleStatusFilter(s.id)}
            style={
              s.color
                ? ({ '--chip-color': s.color } as CSSProperties)
                : undefined
            }
            title={
              hiddenStatuses.has(s.id)
                ? 'Clicar para exibir'
                : 'Clicar para ocultar'
            }
          >
            {s.name}
          </button>
        ))}
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Transações <span className="count-badge">{rows.length}</span>
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : rows.length === 0 && !creating ? (
          <div className="empty">
            <div className="empty-icon">💸</div>
            <h3>Nenhuma transação cadastrada</h3>
            <p>Clique em “Nova transação” para começar.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="transactions-table">
              <colgroup>
                <col style={{ width: '130px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '100px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <div className="th-filter">
                      <span>Data</span>
                      <ColumnFilter
                        value={filters.date ?? ''}
                        onChange={(v) => setFilter('date', v)}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-filter">
                      <span>Valor</span>
                      <ColumnFilter
                        value={filters.amount ?? ''}
                        onChange={(v) => setFilter('amount', v)}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-filter">
                      <span>Carteira</span>
                      <ColumnFilter
                        value={filters.wallet ?? ''}
                        onChange={(v) => setFilter('wallet', v)}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-filter">
                      <span>Categoria</span>
                      <ColumnFilter
                        value={filters.category ?? ''}
                        onChange={(v) => setFilter('category', v)}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-filter">
                      <span>Observações</span>
                      <ColumnFilter
                        value={filters.notes ?? ''}
                        onChange={(v) => setFilter('notes', v)}
                      />
                    </div>
                  </th>
                  <th>
                    <div className="th-filter">
                      <span>Status</span>
                      <ColumnFilter
                        value={filters.status ?? ''}
                        onChange={(v) => setFilter('status', v)}
                      />
                    </div>
                  </th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {creating && (
                  <tr className="is-editing">
                    <td>
                      <input
                        ref={grid.registerCell('new:date')}
                        className="cell-input"
                        placeholder="dd/mm/aaaa"
                        value={newDraft.date}
                        onChange={(e) =>
                          setNewDraft((d) => ({
                            ...d,
                            date: formatDateInput(e.target.value)
                          }))
                        }
                        onBlur={() => {
                          if (newDraft.date) {
                            setNewDraft((d) =>
                              d.date ? { ...d, date: completeDateInput(d.date) } : d
                            )
                          }
                          grid.handleBlur('new:date')
                        }}
                        onKeyDown={grid.gridKeyDown('new:date')}
                      />
                    </td>
                    <td className="cell-amount">
                      <input
                        ref={grid.registerCell('new:amount')}
                        className="cell-input"
                        placeholder="0,00"
                        value={newDraft.amount}
                        onChange={(e) =>
                          setNewDraft((d) => ({ ...d, amount: e.target.value }))
                        }
                        onBlur={() => {
                          setNewDraft((d) =>
                            d.amount ? { ...d, amount: formatAmountBlur(d.amount) } : d
                          )
                          grid.handleBlur('new:amount')
                        }}
                        onKeyDown={grid.gridKeyDown('new:amount')}
                      />
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(wallets, null)}
                        value={newDraft.walletId || null}
                        onChange={(id) =>
                          setNewDraft((d) => ({ ...d, walletId: id ?? 0 }))
                        }
                        placeholder="Selecione…"
                        registerCell={grid.registerCell('new:wallet')}
                        onKeyDown={grid.gridKeyDown('new:wallet')}
                        onBlur={() => grid.handleBlur('new:wallet')}
                      />
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(categories, null)}
                        value={newDraft.categoryId || null}
                        onChange={(id) =>
                          setNewDraft((d) => ({ ...d, categoryId: id ?? 0 }))
                        }
                        placeholder="Selecione…"
                        registerCell={grid.registerCell('new:category')}
                        onKeyDown={grid.gridKeyDown('new:category')}
                        onBlur={() => grid.handleBlur('new:category')}
                      />
                    </td>
                    <td>
                      <input
                        ref={grid.registerCell('new:notes')}
                        className="cell-input"
                        placeholder="Observações"
                        value={newDraft.notes}
                        onChange={(e) =>
                          setNewDraft((d) => ({ ...d, notes: e.target.value }))
                        }
                        onBlur={() => grid.handleBlur('new:notes')}
                        onKeyDown={grid.gridKeyDown('new:notes')}
                      />
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(statuses, null)}
                        value={newDraft.statusId || null}
                        onChange={(id) =>
                          setNewDraft((d) => ({ ...d, statusId: id ?? 0 }))
                        }
                        placeholder="—"
                        allowClear
                        registerCell={grid.registerCell('new:status')}
                        onKeyDown={grid.gridKeyDown('new:status')}
                        onBlur={() => grid.handleBlur('new:status')}
                      />
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

                {filtered.length === 0 && !creating && (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      🔍 Nenhum resultado — ajuste ou limpe a busca.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => {
                  const statusColor =
                    statuses.find((s) => s.id === row.status_id)?.color ?? null
                  return (
                    <tr
                      key={row.id}
                      data-row={row.id}
                      className={[
                        grid.editing?.cellKey?.startsWith(String(row.id) + ':')
                          ? 'is-editing'
                          : '',
                        row.id === highlightId ? 'is-new' : '',
                        statusColor ? 'has-status' : ''
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={
                        statusColor
                          ? ({ '--status-color': statusColor } as CSSProperties)
                          : undefined
                      }
                    >
                    <td>
                      {grid.textCell(
                        row.id,
                        'date',
                        row.date,
                        'Data',
                        formatDateInput,
                        completeDateInput
                      )}
                    </td>
                    <td className="cell-amount">
                      {grid.textCell(
                        row.id,
                        'amount',
                        amountDisplay(row.amount),
                        'Valor',
                        undefined,
                        formatAmountBlur
                      )}
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(wallets, row.wallet_id)}
                        value={row.wallet_id}
                        onChange={(id) => changeWallet(row, id ?? 0)}
                        registerCell={grid.registerCell(`${row.id}:wallet`)}
                        onKeyDown={grid.gridKeyDown(`${row.id}:wallet`)}
                      />
                    </td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(categories, row.category_id)}
                        value={row.category_id}
                        onChange={(id) => changeCategory(row, id ?? 0)}
                        registerCell={grid.registerCell(`${row.id}:category`)}
                        onKeyDown={grid.gridKeyDown(`${row.id}:category`)}
                      />
                    </td>
                    <td>{grid.textCell(row.id, 'notes', row.notes ?? '', 'Observações')}</td>
                    <td>
                      <SearchableSelect
                        options={toSelectOptions(statuses, row.status_id)}
                        value={row.status_id}
                        onChange={(id) => changeStatus(row, id)}
                        allowClear
                        registerCell={grid.registerCell(`${row.id}:status`)}
                        onKeyDown={grid.gridKeyDown(`${row.id}:status`)}
                      />
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
                    )
                })}
              </tbody>
            </table>
            {totalPages > 1 && (
              <div className="pagination">
                <span className="pagination-info">
                  Página {safePage} de {totalPages}
                </span>
                <div className="pagination-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <Toast toast={toast} />
    </div>
  )
}
