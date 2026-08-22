import { useEffect, useState } from 'react'
import WalletTypesScreen from './screens/WalletTypesScreen'
import WalletsScreen from './screens/WalletsScreen'
import CategoriesScreen from './screens/CategoriesScreen'
import TransactionStatusesScreen from './screens/TransactionStatusesScreen'
import TransactionsScreen from './screens/TransactionsScreen'
import CreditTransactionsScreen from './screens/CreditTransactionsScreen'
import RecurringTransactionsScreen from './screens/RecurringTransactionsScreen'
import ReportsScreen from './screens/ReportsScreen'
import BackupScreen from './screens/BackupScreen'
import './styles/global.css'

type Tab =
  | 'wallets'
  | 'types'
  | 'categories'
  | 'statuses'
  | 'transactions'
  | 'credit'
  | 'recurring'
  | 'reports'
  | 'backup'

function App(): JSX.Element {
  const [tab, setTab] = useState<Tab>('reports')

  // Atalhos de teclado: Cmd/Ctrl + 1..8 abrem cada tela.
  useEffect(() => {
    const shortcuts: Record<string, Tab> = {
      '1': 'reports',
      '2': 'transactions',
      '3': 'credit',
      '4': 'recurring',
      '5': 'categories',
      '6': 'wallets',
      '7': 'types',
      '8': 'statuses',
      '9': 'backup'
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (!e.metaKey && !e.ctrlKey) return
      const target = shortcuts[e.key]
      if (target) {
        e.preventDefault()
        setTab(target)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">💰</div>
          <div>
            <div className="brand-name">Money</div>
            <div className="brand-tagline">Seu controle financeiro</div>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <nav className="nav">
            <button
              className={`nav-item ${tab === 'reports' ? 'active' : ''}`}
              onClick={() => setTab('reports')}
            >
              <span className="nav-icon">📊</span>
              <span>Relatório</span>
            </button>
            <button
              className={`nav-item ${tab === 'transactions' ? 'active' : ''}`}
              onClick={() => setTab('transactions')}
            >
              <span className="nav-icon">💸</span>
              <span>Transações</span>
            </button>
            <button
              className={`nav-item ${tab === 'credit' ? 'active' : ''}`}
              onClick={() => setTab('credit')}
            >
              <span className="nav-icon">💳</span>
              <span>Crédito</span>
            </button>
            <button
              className={`nav-item ${tab === 'recurring' ? 'active' : ''}`}
              onClick={() => setTab('recurring')}
            >
              <span className="nav-icon">🔁</span>
              <span>Recorrência</span>
            </button>
            <button
              className={`nav-item ${tab === 'categories' ? 'active' : ''}`}
              onClick={() => setTab('categories')}
            >
              <span className="nav-icon">🏷️</span>
              <span>Categorias</span>
            </button>
            <button
              className={`nav-item ${tab === 'wallets' ? 'active' : ''}`}
              onClick={() => setTab('wallets')}
            >
              <span className="nav-icon">💳</span>
              <span>Carteiras</span>
            </button>
            <button
              className={`nav-item ${tab === 'types' ? 'active' : ''}`}
              onClick={() => setTab('types')}
            >
              <span className="nav-icon">🗂️</span>
              <span>Tipos de Carteira</span>
            </button>
            <button
              className={`nav-item ${tab === 'statuses' ? 'active' : ''}`}
              onClick={() => setTab('statuses')}
            >
              <span className="nav-icon">📌</span>
              <span>Status de Transação</span>
            </button>
            <button
              className={`nav-item ${tab === 'backup' ? 'active' : ''}`}
              onClick={() => setTab('backup')}
            >
              <span className="nav-icon">💾</span>
              <span>Backup</span>
            </button>
          </nav>
          <div className="sidebar-foot">Money v0.1.0</div>
        </aside>

        <main className="main">
          {tab === 'wallets' ? (
            <WalletsScreen />
          ) : tab === 'types' ? (
            <WalletTypesScreen />
          ) : tab === 'categories' ? (
            <CategoriesScreen />
          ) : tab === 'statuses' ? (
            <TransactionStatusesScreen />
          ) : tab === 'transactions' ? (
            <TransactionsScreen />
          ) : tab === 'credit' ? (
            <CreditTransactionsScreen />
          ) : tab === 'recurring' ? (
            <RecurringTransactionsScreen />
          ) : tab === 'backup' ? (
            <BackupScreen />
          ) : (
            <ReportsScreen />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
