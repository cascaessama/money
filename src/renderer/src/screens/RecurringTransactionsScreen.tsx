import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { Toast } from '../components/Toast'
import { Loader } from '../components/Loader'
import { formatDateInput, parseMoney, formatAmountBlur } from '../utils/format'
import { isValidDateBR, completeDateInput } from '../../../shared/validation'
import SearchableSelect, { toSelectOptions } from '../components/SearchableSelect'
import type { TransactionInput, Wallet, Category, TransactionStatus } from '../../../shared/types'

const api = window.api

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Converte "dd/mm/aa" em componentes com ano completo. */
function parseBR(s: string): { d: number; m: number; y: number } {
  const [d, m, y] = s.split('/').map(Number)
  return { d, m, y: 2000 + y }
}

function fmtBR(d: number, m: number, y: number): string {
  return `${pad2(d)}/${pad2(m)}/${pad2(y % 100)}`
}

/** Soma `months` a uma data, ajustando para o último dia do mês quando preciso. */
function addMonthsClamped(
  d: number,
  m: number,
  y: number,
  months: number
): { d: number; m: number; y: number } {
  const total = y * 12 + (m - 1) + months
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  const nd = Math.min(d, new Date(ny, nm, 0).getDate())
  return { d: nd, m: nm, y: ny }
}

export default function RecurringTransactionsScreen(): JSX.Element {
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [statuses, setStatuses] = useState<TransactionStatus[]>([])

  const [date, setDate] = useState('')
  const [amount, setAmount] = useState('')
  const [walletId, setWalletId] = useState<number | null>(null)
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [statusId, setStatusId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [quantity, setQuantity] = useState('2')
  const dateRef = useRef<HTMLInputElement | null>(null)

  const { toast, showToast } = useToast()

  useEffect(() => {
    ;(async () => {
      try {
        const [walletList, categoryList, statusList] = await Promise.all([
          api.wallets.list(),
          api.categories.list(),
          api.transactionStatuses.list()
        ])
        setWallets(walletList)
        setCategories(categoryList)
        setStatuses(statusList)
        // Status padrão: "Devo".
        const devo = statusList.find(
          (s) => s.name.trim().toLowerCase() === 'devo'
        )
        if (devo) setStatusId(devo.id)
      } catch (err) {
        console.error(err)
        showToast('error', 'Erro ao carregar os dados.')
      } finally {
        setLoading(false)
      }
    })()
  }, [showToast])

  /** Prévia das datas que serão geradas. */
  const previewDates = useMemo(() => {
    const completed = completeDateInput(date.trim())
    const qty = parseInt(quantity, 10)
    if (!isValidDateBR(completed) || !(qty >= 2)) return []
    const start = parseBR(completed)
    const dates: string[] = []
    for (let i = 0; i < qty; i++) {
      const nx = addMonthsClamped(start.d, start.m, start.y, i)
      dates.push(fmtBR(nx.d, nx.m, nx.y))
    }
    return dates
  }, [date, quantity])

  // Status padrão da tela.
  const devoStatusId =
    statuses.find((s) => s.name.trim().toLowerCase() === 'devo')?.id ?? null

  function handleReset(): void {
    setDate('')
    setAmount('')
    setWalletId(null)
    setCategoryId(null)
    setStatusId(devoStatusId)
    setNotes('')
    setQuantity('2')
  }

  const handleSubmit = useCallback(async () => {
    const completed = completeDateInput(date.trim())
    const amountValue = parseMoney(amount)
    const qty = parseInt(quantity, 10)

    if (!isValidDateBR(completed)) {
      showToast('error', 'Data inválida. Use o formato dd/mm/aa.')
      return
    }
    if (!amountValue) {
      showToast('error', 'Informe um valor.')
      return
    }
    if (!walletId) {
      showToast('error', 'Selecione uma carteira.')
      return
    }
    if (!categoryId) {
      showToast('error', 'Selecione uma categoria.')
      return
    }
    if (!(qty >= 2)) {
      showToast('error', 'Quantidade deve ser no mínimo 2.')
      return
    }

    const start = parseBR(completed)
    const inputs: TransactionInput[] = []
    for (let i = 0; i < qty; i++) {
      const nx = addMonthsClamped(start.d, start.m, start.y, i)
      inputs.push({
        date: fmtBR(nx.d, nx.m, nx.y),
        amount: amountValue,
        wallet_id: walletId,
        category_id: categoryId,
        notes: notes.trim(),
        status_id: statusId
      })
    }

    setBusy(true)
    try {
      const created = await api.transactions.createMany(inputs)
      showToast('success', `${created.length} transações criadas.`)
      handleReset()
      dateRef.current?.focus()
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : String(err)
      showToast('error', `Erro ao criar: ${msg}`)
    } finally {
      setBusy(false)
    }
  }, [date, amount, walletId, categoryId, statusId, notes, quantity, showToast])

  return (
    <div className="screen">
      <div className="page-head">
        <div>
          <h1 className="page-title">Recorrência</h1>
          <div className="page-subtitle">
            Crie uma transação repetida mensalmente (ex.: parcelas de cartão de
            crédito).
          </div>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="report-actions">
            <div className="report-field">
              <span className="report-label">Data</span>
              <input
                ref={dateRef}
                className="select-input"
                placeholder="dd/mm/aa"
                value={date}
                onChange={(e) => setDate(formatDateInput(e.target.value))}
                onBlur={() => setDate((v) => (v ? completeDateInput(v) : v))}
              />
            </div>
            <div className="report-field">
              <span className="report-label">Valor</span>
              <input
                className="select-input"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={() => setAmount((v) => formatAmountBlur(v))}
              />
            </div>
            <div className="report-field report-field-wide">
              <span className="report-label">Carteira</span>
              <SearchableSelect
                options={toSelectOptions(wallets, walletId)}
                value={walletId}
                onChange={setWalletId}
                placeholder="Selecione…"
              />
            </div>
            <div className="report-field report-field-wide">
              <span className="report-label">Categoria</span>
              <SearchableSelect
                options={toSelectOptions(categories, categoryId)}
                value={categoryId}
                onChange={setCategoryId}
                placeholder="Selecione…"
              />
            </div>
            <div className="report-field report-field-wide">
              <span className="report-label">Observações</span>
              <input
                className="select-input"
                placeholder="Opcional"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="report-field report-field-wide">
              <span className="report-label">Status</span>
              <SearchableSelect
                options={toSelectOptions(statuses, statusId)}
                value={statusId}
                onChange={setStatusId}
                placeholder="Selecione…"
                allowClear
              />
            </div>
            <div className="report-field">
              <span className="report-label">Quantidade</span>
              <input
                className="select-input"
                type="number"
                min={2}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="report-actions-buttons">
              <button
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={busy}
              >
                {busy ? 'Criando…' : 'Confirmar'}
              </button>
              <button className="btn btn-ghost" onClick={handleReset}>
                Limpar
              </button>
            </div>
          </div>

          {previewDates.length > 0 && (
            <div className="card" style={{ padding: '14px 18px' }}>
              <div className="report-label" style={{ marginBottom: '10px' }}>
                Serão criadas {previewDates.length} transações:
              </div>
              <div className="status-filter">
                {previewDates.map((d) => (
                  <span key={d} className="status-chip">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Toast toast={toast} />
    </div>
  )
}
