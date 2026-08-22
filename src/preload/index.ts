// Ponte segura entre o processo principal e a interface.
import { contextBridge, ipcRenderer } from 'electron'
import type {
  WalletType,
  WalletTypeInput,
  Wallet,
  WalletInput,
  Category,
  CategoryInput,
  TransactionStatus,
  TransactionStatusInput,
  Transaction,
  TransactionInput,
  MarkAsPaidInput,
  PeriodReportInput,
  PeriodReport
} from '../shared/types'

const api = {
  walletsTypes: {
    list: (): Promise<WalletType[]> => ipcRenderer.invoke('wallets-types:list'),
    create: (input: WalletTypeInput): Promise<WalletType> =>
      ipcRenderer.invoke('wallets-types:create', input),
    update: (id: number, input: WalletTypeInput): Promise<WalletType | undefined> =>
      ipcRenderer.invoke('wallets-types:update', id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('wallets-types:delete', id)
  },
  wallets: {
    list: (): Promise<Wallet[]> => ipcRenderer.invoke('wallets:list'),
    create: (input: WalletInput): Promise<Wallet> =>
      ipcRenderer.invoke('wallets:create', input),
    update: (id: number, input: WalletInput): Promise<Wallet | undefined> =>
      ipcRenderer.invoke('wallets:update', id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('wallets:delete', id)
  },
  categories: {
    list: (): Promise<Category[]> => ipcRenderer.invoke('categories:list'),
    create: (input: CategoryInput): Promise<Category> =>
      ipcRenderer.invoke('categories:create', input),
    update: (id: number, input: CategoryInput): Promise<Category | undefined> =>
      ipcRenderer.invoke('categories:update', id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('categories:delete', id)
  },
  transactionStatuses: {
    list: (): Promise<TransactionStatus[]> =>
      ipcRenderer.invoke('transaction-statuses:list'),
    create: (input: TransactionStatusInput): Promise<TransactionStatus> =>
      ipcRenderer.invoke('transaction-statuses:create', input),
    update: (
      id: number,
      input: TransactionStatusInput
    ): Promise<TransactionStatus | undefined> =>
      ipcRenderer.invoke('transaction-statuses:update', id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('transaction-statuses:delete', id)
  },
  transactions: {
    list: (): Promise<Transaction[]> =>
      ipcRenderer.invoke('transactions:list'),
    create: (input: TransactionInput): Promise<Transaction> =>
      ipcRenderer.invoke('transactions:create', input),
    createMany: (inputs: TransactionInput[]): Promise<Transaction[]> =>
      ipcRenderer.invoke('transactions:create-many', inputs),
    update: (
      id: number,
      input: TransactionInput
    ): Promise<Transaction | undefined> =>
      ipcRenderer.invoke('transactions:update', id, input),
    remove: (id: number): Promise<boolean> =>
      ipcRenderer.invoke('transactions:delete', id),
    markAsPaid: (input: MarkAsPaidInput): Promise<number> =>
      ipcRenderer.invoke('transactions:mark-as-paid', input)
  },
  reports: {
    period: (input: PeriodReportInput): Promise<PeriodReport> =>
      ipcRenderer.invoke('reports:period', input)
  },
  backup: {
    export: (): Promise<{ canceled: boolean; filePath?: string }> =>
      ipcRenderer.invoke('backup:export'),
    import: (): Promise<{ canceled: boolean }> =>
      ipcRenderer.invoke('backup:import')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (definido no d.ts)
  window.api = api
}
