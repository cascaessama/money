import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { amountDisplay, formatDateInput } from '../utils/format'
import { isValidDateBR, completeDateInput } from '../../../shared/validation'
import { APP_CONFIG } from '../../../shared/config'
import { dateMatcher } from '../utils/dateFilter'
import { useColumnFilters } from '../hooks/useColumnFilters'
import ColumnFilter from '../components/ColumnFilter'
import SearchableSelect, { toSelectOptions } from '../components/SearchableSelect'
import type {
  Transaction,
  Wallet,
  Category,
  TransactionStatus,
  WalletType
} from '../../../shared/types'

const api = window.api

const PAGE_SIZE = APP_CONFIG.pageSize

export default function CreditTransactionsScreen(): JSX.Element {
  const [rows, setRows] = useState<Transaction[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<TransactionStatus[]>([])
  const [types, setTypes] = useState<WalletType[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [selectedWalletId, setSelectedWalletId] = useState<number | null>(null)
  const [paidDate, setPaidDate] = useState('')
  const { toast, showToast } = useToast()
  const { filters, setFilter, applyFilters } = useColumnFilters(dateMatcher)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [transactions, walletList, categoryList, statusList, typeList] =
        await Promise.all([
          api.transactions.list(),
          api.wallets.list(),
          api.categories.list(),
          api.transactionStatuses.list(),
          api.walletsTypes.list()
        ])
      setRows(transactions)
      setWallets(walletList)
      setCategories(categoryList)
      setStatuses(statusList)
      setTypes(typeList)
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

  // Carteiras cujo tipo contém o trecho configurado (padrão: "crédito").
  const typeById = new Map(types.map((t) => [t.id, t]))
  const creditWalletIds = new Set(
    wallets
      .filter((w) =>
        (typeById.get(w.type_id)?.name ?? '')
          .toLowerCase()
          .includes(APP_CONFIG.creditWalletTypeMatch)
      )
      .map((w) => w.id)
  )
  const creditWallets = wallets.filter((w) => creditWalletIds.has(w.id))

  const creditRows = rows.filter(
    (t) => creditWalletIds.has(t.wallet_id) && t.status_id == null
  )

  const baseFiltered = applyFilters(creditRows, (row, field) => {
    if (field === 'wallet')
      return wallets.find((w) => w.id === row.wallet_id)?.name ?? ''
    if (field === 'category')
      return categories.find((c) => c.id === row.category_id)?.name ?? ''
    if (field === 'notes') return row.notes ?? ''
    if (field === 'date') return row.date
    if (field === 'amount') return amountDisplay(row.amount)
    return ''
  })
  const filtered = baseFiltered

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filters])

  async function handleMarkAsPaid(): Promise<void> {
    if (!selectedWalletId) {
      showToast('error', 'Selecione uma conta de crédito.')
      return
    }
    const date = completeDateInput(paidDate.trim())
    if (!isValidDateBR(date)) {
      showToast('error', 'Informe uma data válida (dd/mm/aa).')
      return
    }
    const pago = statuses.find(
      (s) => s.name.toLowerCase() === APP_CONFIG.paidStatusName && s.is_active
    )
    if (!pago) {
      showToast('error', 'Crie um status ativo chamado “Pago”.')
      return
    }
    try {
      const count = await api.transactions.markAsPaid({
        wallet_id: selectedWalletId,
        status_id: pago.id,
        date
      })
      showToast('success', `${count} transação(ões) marcada(s) como pago.`)
      await load()
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao marcar como pago.')
    }
  }

  const walletName = (id: number): string =>
    wallets.find((w) => w.id === id)?.name ?? ''
  const categoryName = (id: number | null): string =>
    categories.find((c) => c.id === id)?.name ?? ''
  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Transações de Crédito</h1>
          <div className="page-subtitle">
            Apenas visualização (somente leitura). Filtre por coluna.
          </div>
        </div>
      </div>

      <div className="credit-actions">
        <div className="credit-actions-label">Marcar como pago</div>
        <div className="credit-field">
          <span className="credit-label">Conta de crédito</span>
          <SearchableSelect
            options={toSelectOptions(creditWallets, selectedWalletId)}
            value={selectedWalletId}
            onChange={setSelectedWalletId}
            placeholder="Selecionar conta…"
          />
        </div>
        <div className="credit-field credit-field-date">
          <label className="credit-label" htmlFor="credit-date">
            Data
          </label>
          <input
            id="credit-date"
            className="select-input"
            placeholder="dd/mm/aa"
            value={paidDate}
            onChange={(e) => setPaidDate(formatDateInput(e.target.value))}
            onBlur={() => setPaidDate((v) => (v ? completeDateInput(v) : v))}
          />
        </div>
        <button
          className="btn btn-primary credit-actions-btn"
          onClick={handleMarkAsPaid}
        >
          ✓ Confirmar
        </button>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>
            Crédito <span className="count-badge">{creditRows.length}</span>
          </h2>
        </div>

        {loading ? (
          <Loader />
        ) : creditRows.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">💳</div>
            <h3>Nenhuma transação de crédito</h3>
            <p>
              Crie carteiras com tipo contendo “crédito” e registre transações.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="transactions-table">
              <colgroup>
                <col style={{ width: '120px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '200px' }} />
                <col style={{ width: '260px' }} />
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
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      🔍 Nenhum resultado — ajuste ou limpe a busca.
                    </td>
                  </tr>
                )}

                {pageRows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td className="cell-amount">{amountDisplay(row.amount)}</td>
                    <td>{walletName(row.wallet_id)}</td>
                    <td>{categoryName(row.category_id)}</td>
                    <td>{row.notes}</td>
                  </tr>
                ))}
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
