/** Barrel do módulo de banco — exporta as funções de cada domínio. */
export { initDatabase } from './migrations'
export { exportBackup, importBackup } from './connection'
export {
  listWalletTypes,
  createWalletType,
  updateWalletType,
  deleteWalletType
} from './walletTypes'
export { listWallets, createWallet, updateWallet, deleteWallet } from './wallets'
export {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory
} from './categories'
export {
  listTransactionStatuses,
  createTransactionStatus,
  updateTransactionStatus,
  deleteTransactionStatus
} from './transactionStatuses'
export {
  listTransactions,
  createTransaction,
  createTransactions,
  updateTransaction,
  deleteTransaction,
  markTransactionsAsPaid
} from './transactions'
export { periodReport } from './reports'
