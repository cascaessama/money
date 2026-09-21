import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { formatCurrency, formatDateInput, amountDisplay } from '../utils/format'
import { isValidDateBR, completeDateInput } from '../../../shared/validation'
import SearchableSelect, { toSelectOptions } from '../components/SearchableSelect'
import { REPORT_STATUS_NONE } from '../../../shared/types'
import { PREVISTO_STATUS_NAMES, DEVO_STATUS_NAMES } from '../config'
import type {
  Category,
  PeriodReport,
  Transaction,
  TransactionStatus,
  Wallet
} from '../../../shared/types'

const api = window.api

const SEM_STATUS_LABEL = '—'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseDateBR(s: string): Date {
  const [d, m, y] = s.split('/').map(Number)
  return new Date(2000 + y, m - 1, d)
}

function fmtDateBR(d: Date): string {
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${pad2(
    d.getFullYear() % 100
  )}`
}

/** Último dia do mês no formato dd/mm/aa. */
function lastDayOfMonth(d: Date): string {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return `${pad2(last)}/${pad2(d.getMonth() + 1)}/${pad2(d.getFullYear() % 100)}`
}

export default function ReportsScreen(): JSX.Element {
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<TransactionStatus[]>([])
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])
  const [report, setReport] = useState<PeriodReport | null>(null)
  const [prevReport, setPrevReport] = useState<PeriodReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [openCategory, setOpenCategory] = useState<number | null>(null)
  const [catSort, setCatSort] = useState<{
    key: string
    dir: 'asc' | 'desc'
  } | null>(null)
  const [statusSort, setStatusSort] = useState<{
    key: string
    dir: 'asc' | 'desc'
  } | null>(null)

  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [statusId, setStatusId] = useState<number | null>(null)

  const { toast, showToast } = useToast()

  const loadRefs = useCallback(async () => {
    try {
      const [categoryList, statusList, walletList, transactionList] =
        await Promise.all([
          api.categories.list(),
          api.transactionStatuses.list(),
          api.wallets.list(),
          api.transactions.list()
        ])
      setCategories(categoryList)
      setStatuses(statusList)
      setWallets(walletList)
      setAllTransactions(transactionList)
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao carregar os dados de referência.')
    }
  }, [showToast])

  useEffect(() => {
    // Período padrão: mês atual (01/MM/AA até o último dia do mês).
    const now = new Date()
    const firstDay = `01/${pad2(now.getMonth() + 1)}/${pad2(now.getFullYear() % 100)}`
    const lastDay = lastDayOfMonth(now)
    setDateStart(firstDay)
    setDateEnd(lastDay)
    ;(async () => {
      await loadRefs()
      await runReport(firstDay, lastDay, null, null)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runReport(
    start: string,
    end: string,
    catId: number | null,
    statId: number | null
  ): Promise<void> {
    setRunning(true)
    try {
      const data = await api.reports.period({
        date_start: start,
        date_end: end,
        category_id: catId,
        status_id: statId
      })
      setReport(data)

      // Período anterior: mês de calendário inteiro antes do mês do início atual.
      const s = parseDateBR(start)
      const prevStart = new Date(s.getFullYear(), s.getMonth() - 1, 1)
      const prevEnd = new Date(s.getFullYear(), s.getMonth(), 0)
      const prevData = await api.reports.period({
        date_start: fmtDateBR(prevStart),
        date_end: fmtDateBR(prevEnd),
        category_id: catId,
        status_id: statId
      })
      setPrevReport(prevData)
    } catch (err) {
      console.error(err)
      showToast('error', 'Erro ao gerar o relatório.')
    } finally {
      setLoading(false)
      setRunning(false)
    }
  }

  async function handleApply(): Promise<void> {
    const start = completeDateInput(dateStart.trim())
    const end = completeDateInput(dateEnd.trim())
    if (!isValidDateBR(start) || !isValidDateBR(end)) {
      showToast('error', 'Informe datas válidas (dd/mm/aa).')
      return
    }
    setDateStart(start)
    setDateEnd(end)
    await runReport(start, end, categoryId, statusId)
  }

  function handleReset(): void {
    setCategoryId(null)
    setStatusId(null)
    const now = new Date()
    const firstDay = `01/${pad2(now.getMonth() + 1)}/${pad2(now.getFullYear() % 100)}`
    const lastDay = lastDayOfMonth(now)
    setDateStart(firstDay)
    setDateEnd(lastDay)
    void runReport(firstDay, lastDay, null, null)
  }

  const categoryName = (id: number): string =>
    categories.find((c) => c.id === id)?.name ?? '—'
  const statusName = (id: number | null): string =>
    statuses.find((s) => s.id === id)?.name ?? '—'
  const walletName = (id: number): string =>
    wallets.find((w) => w.id === id)?.name ?? '—'

  const categoryTransactions =
    report?.transactions.filter((t) => t.category_id === openCategory) ?? []
  const catReceived = categoryTransactions
    .filter((t) => t.amount >= 0)
    .reduce((sum, t) => sum + t.amount, 0)
  const catSpent = categoryTransactions
    .filter((t) => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const statusOptions = [
    ...toSelectOptions(statuses, statusId),
    { id: REPORT_STATUS_NONE, name: SEM_STATUS_LABEL }
  ]

  const netPositive = (report?.net ?? 0) >= 0

  const totalReceived = report?.total_received ?? 0
  const totalSpentAbs = report ? Math.abs(report.total_spent) : 0

  // Soma de TODAS as transações (independente do período) com status de "Previsto".
  const previstoAllTotal = allTransactions
    .filter((t) =>
      PREVISTO_STATUS_NAMES.includes(statusName(t.status_id).toLowerCase())
    )
    .reduce((sum, t) => sum + t.amount, 0)

  // Soma de TODAS as transações (independente do período) com status "Devo".
  const devoAllTotal = allTransactions
    .filter((t) =>
      DEVO_STATUS_NAMES.includes(statusName(t.status_id).toLowerCase())
    )
    .reduce((sum, t) => sum + t.amount, 0)

  // Saldo das carteiras ativas (mesmo valor exibido na tabela Carteiras).
  const walletBalances = wallets
    .filter((w) => w.is_active)
    .map((w) => ({ id: w.id, name: w.name, balance: w.balance }))
    .sort((a, b) => b.balance - a.balance)

  // Soma total dos saldos das carteiras ativas.
  const totalBalance = walletBalances.reduce((sum, w) => sum + w.balance, 0)

  // Saldo projetado: saldo atual (realizado) somado ao previsto COM sinal.
  // O previsto positivo (a receber) aumenta; o negativo (a pagar) reduz.
  const projectedBalance = totalBalance + previstoAllTotal

  const formatPct = (v: number): string => {
    const s = (v * 100).toFixed(1).replace('.', ',')
    return s.endsWith(',0') ? `${s.slice(0, -2)}%` : `${s}%`
  }

  const categoryRows = (report?.by_category ?? []).map((c) => ({
    ...c,
    name: categoryName(c.category_id),
    pctGasto: totalSpentAbs > 0 ? Math.abs(c.spent) / totalSpentAbs : 0,
    pctRecebido: totalReceived > 0 ? c.received / totalReceived : 0
  }))

  const statusRows = (report?.by_status ?? []).map((s) => ({
    ...s,
    name: statusName(s.status_id)
  }))

  const toggleCatSort = (key: string): void => {
    setCatSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }
  const toggleStatusSort = (key: string): void => {
    setStatusSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' }
      return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
    })
  }

  const sortRows = <T,>(
    rows: T[],
    sort: { key: string; dir: 'asc' | 'desc' } | null,
    nameOf: (r: T) => string
  ): T[] => {
    if (!sort) return rows
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.key === 'name') {
        return nameOf(a).localeCompare(nameOf(b), 'pt-BR') * dir
      }
      const av = (a as Record<string, unknown>)[sort.key]
      const bv = (b as Record<string, unknown>)[sort.key]
      return (Number(av ?? 0) - Number(bv ?? 0)) * dir
    })
  }

  const sortedCatRows = sortRows(categoryRows, catSort, (r) => r.name)
  const sortedStatusRows = sortRows(statusRows, statusSort, (r) => r.name)

  const sortArrow = (key: string, sort: { key: string; dir: 'asc' | 'desc' } | null): string =>
    sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''

  // Comparação com o período anterior.
  const prevReceived = prevReport?.total_received ?? 0
  const prevSpentAbs = prevReport ? Math.abs(prevReport.total_spent) : 0
  const prevNet = prevReport?.net ?? 0

  const pctDelta = (cur: number, prev: number): number | null => {
    if (prev === 0) return cur === 0 ? 0 : null
    return ((cur - prev) / Math.abs(prev)) * 100
  }

  const deltaReceived = pctDelta(totalReceived, prevReceived)
  const deltaSpent = pctDelta(totalSpentAbs, prevSpentAbs)
  const deltaNet = pctDelta(report?.net ?? 0, prevNet)

  const renderDelta = (v: number | null, invert: boolean): JSX.Element | null => {
    if (v == null) {
      return null
    }
    const good = v === 0 ? null : invert ? v < 0 : v > 0
    const cls =
      good == null
        ? 'report-delta-neutral'
        : good
          ? 'report-delta-good'
          : 'report-delta-bad'
    const arrow = v > 0 ? '▲' : v < 0 ? '▼' : '—'
    const txt = v === 0 ? '0,0% vs anterior' : `${arrow} ${Math.abs(v).toFixed(1).replace('.', ',')}% vs anterior`
    return <div className={`report-delta ${cls}`}>{txt}</div>
  }

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Relatório do Período</h1>
          <div className="page-subtitle">
            O que foi recebido e gasto em um intervalo de datas.
          </div>
        </div>
      </div>

      <div className="card wallets-card">
        {walletBalances.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👛</div>
            <p>Nenhuma carteira ativa.</p>
          </div>
        ) : (
          <div className="wallet-summary">
            {walletBalances.map((w) => (
              <div key={w.id} className="wallet-card">
                <span className="wallet-card-name" title={w.name}>
                  {w.name}
                </span>
                <span
                  className={`wallet-card-balance ${w.balance < 0 ? 'negative' : ''}`}
                >
                  {formatCurrency(w.balance)}
                </span>
              </div>
            ))}
            <div className="wallet-summary-summary">
              <div className="wallet-card total">
                <span className="wallet-card-name">Total</span>
                <span
                  className={`wallet-card-balance ${totalBalance < 0 ? 'negative' : ''}`}
                >
                  {formatCurrency(totalBalance)}
                </span>
              </div>
              <div className="wallet-card previsto">
                <span className="wallet-card-name">Previsto</span>
                <span
                  className={`wallet-card-balance ${previstoAllTotal < 0 ? 'negative' : ''}`}
                >
                  {formatCurrency(previstoAllTotal)}
                </span>
              </div>
              <div className="wallet-card total-previsto">
                <span className="wallet-card-name">Projetado</span>
                <span
                  className={`wallet-card-balance ${projectedBalance < 0 ? 'negative' : ''}`}
                >
                  {formatCurrency(projectedBalance)}
                </span>
              </div>
              <div className="wallet-card devo">
                <span className="wallet-card-name">Devo</span>
                <span
                  className={`wallet-card-balance ${devoAllTotal < 0 ? 'negative' : ''}`}
                >
                  {formatCurrency(devoAllTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="report-actions">
        <div className="report-field">
          <span className="report-label">Data início</span>
          <input
            className="select-input"
            placeholder="dd/mm/aa"
            value={dateStart}
            onChange={(e) => setDateStart(formatDateInput(e.target.value))}
            onBlur={() =>
              setDateStart((v) => (v ? completeDateInput(v) : v))
            }
          />
        </div>
        <div className="report-field">
          <span className="report-label">Data fim</span>
          <input
            className="select-input"
            placeholder="dd/mm/aa"
            value={dateEnd}
            onChange={(e) => setDateEnd(formatDateInput(e.target.value))}
            onBlur={() => setDateEnd((v) => (v ? completeDateInput(v) : v))}
          />
        </div>
        <div className="report-field report-field-wide">
          <span className="report-label">Categoria</span>
          <SearchableSelect
            options={toSelectOptions(categories, categoryId)}
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Todas as categorias…"
            allowClear
          />
        </div>
        <div className="report-field report-field-wide">
          <span className="report-label">Status</span>
          <SearchableSelect
            options={statusOptions}
            value={statusId}
            onChange={setStatusId}
            placeholder="Todos os status…"
            allowClear
          />
        </div>
        <div className="report-actions-buttons">
          <button
            className="btn btn-primary"
            onClick={handleApply}
            disabled={running}
          >
            {running ? 'Gerando…' : 'Aplicar'}
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            Limpar
          </button>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : !report ? (
        <div className="empty">
          <div className="empty-icon">📊</div>
          <h3>Sem dados</h3>
          <p>Defina um período e clique em “Aplicar”.</p>
        </div>
      ) : (
        <>
          <div className="report-cards">
            <div className="report-card report-card-in">
              <div className="report-card-label">💰 Recebido</div>
              <div className="report-card-value">
                {formatCurrency(report.total_received)}
              </div>
              {renderDelta(deltaReceived, false)}
            </div>
            <div className="report-card report-card-out">
              <div className="report-card-label">💸 Gasto</div>
              <div className="report-card-value">
                {formatCurrency(report.total_spent)}
              </div>
              {renderDelta(deltaSpent, true)}
            </div>
            <div
              className={`report-card ${netPositive ? 'report-card-net-pos' : 'report-card-net-neg'}`}
            >
              <div className="report-card-label">⚖️ Saldo do período</div>
              <div className="report-card-value">
                {formatCurrency(report.net)}
              </div>
              {renderDelta(deltaNet, false)}
            </div>
            <div className="report-card">
              <div className="report-card-label">🔢 Transações</div>
              <div className="report-card-value">{report.transaction_count}</div>
            </div>
          </div>

          <div className="report-sections">
            <section className="card report-section">
              <div className="card-head">
                <h2>Por categoria</h2>
              </div>
            {report.by_category.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🗂️</div>
                <p>Nenhuma transação no período.</p>
                <span>Não há dados para as datas e filtros selecionados.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="report-table">
                  <colgroup>
                    <col />
                    <col className="col-amount" />
                    <col className="col-pct" />
                    <col className="col-amount" />
                    <col className="col-pct" />
                    <col className="col-amount" />
                    <col className="col-num" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleCatSort('name')}
                        >
                          Categoria{sortArrow('name', catSort)}
                        </button>
                      </th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleCatSort('received')}
                        >
                          Recebido{sortArrow('received', catSort)}
                        </button>
                      </th>
                      <th className="num pct">%</th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleCatSort('spent')}
                        >
                          Gasto{sortArrow('spent', catSort)}
                        </button>
                      </th>
                      <th className="num pct">%</th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleCatSort('net')}
                        >
                          Saldo{sortArrow('net', catSort)}
                        </button>
                      </th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleCatSort('count')}
                        >
                          Qtd{sortArrow('count', catSort)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCatRows.map((c) => (
                      <tr key={c.category_id}>
                        <td>
                          <button
                            type="button"
                            className="report-link"
                            onClick={() => setOpenCategory(c.category_id)}
                          >
                            {c.name}
                          </button>
                        </td>
                        <td className="num report-pos">
                          {amountDisplay(c.received)}
                        </td>
                        <td className="num pct report-muted">
                          {formatPct(c.pctRecebido)}
                        </td>
                        <td className="num report-neg">
                          {amountDisplay(c.spent)}
                        </td>
                        <td className="num pct report-muted">
                          {formatPct(c.pctGasto)}
                        </td>
                        <td
                          className={`num ${c.net >= 0 ? 'report-pos' : 'report-neg'}`}
                        >
                          {amountDisplay(c.net)}
                        </td>
                        <td className="num">{c.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </section>

            <section className="card report-section">
              <div className="card-head">
                <h2>Por status</h2>
              </div>
            {report.by_status.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📌</div>
                <p>Nenhuma transação no período.</p>
                <span>Não há dados para as datas e filtros selecionados.</span>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="report-table">
                  <colgroup>
                    <col className="col-status-name" />
                    <col className="col-status-total" />
                    <col className="col-status-qty" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleStatusSort('name')}
                        >
                          Status{sortArrow('name', statusSort)}
                        </button>
                      </th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleStatusSort('amount')}
                        >
                          Total{sortArrow('amount', statusSort)}
                        </button>
                      </th>
                      <th className="num">
                        <button
                          type="button"
                          className="sort-btn"
                          onClick={() => toggleStatusSort('count')}
                        >
                          Qtd{sortArrow('count', statusSort)}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedStatusRows.map((s) => (
                      <tr key={s.status_id ?? 'none'}>
                        <td>{s.name}</td>
                        <td
                          className={`num ${s.amount >= 0 ? 'report-pos' : 'report-neg'}`}
                        >
                          {amountDisplay(s.amount)}
                        </td>
                        <td className="num">{s.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            </section>
          </div>
        </>
      )}

      {openCategory != null && (
        <div className="modal-backdrop" onClick={() => setOpenCategory(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{categoryName(openCategory)}</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setOpenCategory(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-summary">
              <span>
                Total de itens: <b>{categoryTransactions.length}</b>
              </span>
              <span>
                Recebido: <b className="report-pos">{formatCurrency(catReceived)}</b>
              </span>
              <span>
                Gasto: <b className="report-neg">{formatCurrency(catSpent)}</b>
              </span>
            </div>
            {categoryTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <p>Nenhuma transação desta categoria no período.</p>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Valor</th>
                      <th>Carteira</th>
                      <th>Observações</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryTransactions.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td
                          className={`cell-amount ${t.amount >= 0 ? 'report-pos' : 'report-neg'}`}
                        >
                          {amountDisplay(t.amount)}
                        </td>
                        <td>{walletName(t.wallet_id)}</td>
                        <td>{t.notes}</td>
                        <td>{statusName(t.status_id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setOpenCategory(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </div>
  )
}
