/**
 * Tipos compartilhados entre o processo principal (main), o preload e o renderer.
 * Fonte única de verdade para as entidades e para a API exposta via preload.
 */

export interface WalletType {
  id: number
  name: string
  is_active: boolean
}

export interface WalletTypeInput {
  name: string
  is_active: boolean
}

export interface Wallet {
  id: number
  name: string
  type_id: number
  balance: number
  is_active: boolean
}

export interface WalletInput {
  name: string
  type_id: number
  balance: number
  is_active: boolean
}

export interface Category {
  id: number
  name: string
  is_active: boolean
}

export interface CategoryInput {
  name: string
  is_active: boolean
}

export interface TransactionStatus {
  id: number
  name: string
  is_active: boolean
  color: string | null
}

export interface TransactionStatusInput {
  name: string
  is_active: boolean
  color: string | null
}

export interface Transaction {
  id: number
  date: string
  amount: number
  wallet_id: number
  category_id: number
  notes: string
  status_id: number | null
}

export interface TransactionInput {
  date: string
  amount: number
  wallet_id: number
  category_id: number
  notes: string
  status_id: number | null
}

export interface MarkAsPaidInput {
  wallet_id: number
  status_id: number
  date: string
}

export interface PeriodReportInput {
  date_start: string
  date_end: string
  category_id?: number | null
  status_id?: number | null
}

/** Valor-sentinela para filtrar o relatório por transações SEM status. */
export const REPORT_STATUS_NONE = -1

export interface PeriodReportCategory {
  category_id: number
  received: number
  spent: number
  net: number
  count: number
}

export interface PeriodReportStatus {
  status_id: number | null
  amount: number
  count: number
}

export interface PeriodReport {
  total_received: number
  total_spent: number
  net: number
  transaction_count: number
  by_category: PeriodReportCategory[]
  by_status: PeriodReportStatus[]
  transactions: Transaction[]
}

export interface Api {
  walletsTypes: {
    list: () => Promise<WalletType[]>
    create: (input: WalletTypeInput) => Promise<WalletType>
    update: (id: number, input: WalletTypeInput) => Promise<WalletType | undefined>
    remove: (id: number) => Promise<boolean>
  }
  wallets: {
    list: () => Promise<Wallet[]>
    create: (input: WalletInput) => Promise<Wallet>
    update: (id: number, input: WalletInput) => Promise<Wallet | undefined>
    remove: (id: number) => Promise<boolean>
  }
  categories: {
    list: () => Promise<Category[]>
    create: (input: CategoryInput) => Promise<Category>
    update: (id: number, input: CategoryInput) => Promise<Category | undefined>
    remove: (id: number) => Promise<boolean>
  }
  transactionStatuses: {
    list: () => Promise<TransactionStatus[]>
    create: (input: TransactionStatusInput) => Promise<TransactionStatus>
    update: (
      id: number,
      input: TransactionStatusInput
    ) => Promise<TransactionStatus | undefined>
    remove: (id: number) => Promise<boolean>
  }
  transactions: {
    list: () => Promise<Transaction[]>
    create: (input: TransactionInput) => Promise<Transaction>
    createMany: (inputs: TransactionInput[]) => Promise<Transaction[]>
    update: (
      id: number,
      input: TransactionInput
    ) => Promise<Transaction | undefined>
    remove: (id: number) => Promise<boolean>
    markAsPaid: (input: MarkAsPaidInput) => Promise<number>
  }
  reports: {
    period: (input: PeriodReportInput) => Promise<PeriodReport>
  }
  backup: {
    export: () => Promise<{ canceled: boolean; filePath?: string }>
    import: () => Promise<{ canceled: boolean }>
  }
}
