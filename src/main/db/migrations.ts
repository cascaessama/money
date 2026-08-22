import { getDb, initConnection, persist } from './connection'

/** Colunas atuais da tabela wallets. */
function walletColumns(): string[] {
  const db = getDb()
  const res = db.exec('PRAGMA table_info(wallets)')
  return res.length ? res[0].values.map((c) => String(c[1])) : []
}

/** Cria a tabela wallets com o schema atual, ou migra de name → type_id. */
function ensureWalletsTable(): void {
  const db = getDb()
  const cols = walletColumns()

  // Nova tabela ainda não existe.
  if (cols.length === 0) {
    db.run(`
      CREATE TABLE wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type_id INTEGER NOT NULL REFERENCES wallets_types(id) ON DELETE RESTRICT,
        balance REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      )
    `)
    return
  }

  // Schema antigo (guarda o nome em `type`): migra para `type_id`.
  if (cols.includes('type') && !cols.includes('type_id')) {
    db.run(`
      CREATE TABLE wallets_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type_id INTEGER NOT NULL REFERENCES wallets_types(id) ON DELETE RESTRICT,
        balance REAL DEFAULT 0,
        is_active BOOLEAN DEFAULT 1
      )
    `)
    // Copia apenas carteiras cujo tipo ainda existe (descarta as órfãs).
    db.run(`
      INSERT INTO wallets_new (id, name, type_id, balance, is_active)
      SELECT w.id, w.name, t.id, w.balance, w.is_active
      FROM wallets w
      JOIN wallets_types t ON w.type = t.name
    `)
    db.run('DROP TABLE wallets')
    db.run('ALTER TABLE wallets_new RENAME TO wallets')
  }
}

/** Garante o schema de transactions (categoria obrigatória). */
function ensureTransactionsTable(): void {
  const db = getDb()
  const res = db.exec('PRAGMA table_info(transactions)')
  const cols = res.length ? res[0].values : []

  // Nova tabela ainda não existe.
  if (cols.length === 0) {
    db.run(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        notes TEXT,
        status_id INTEGER REFERENCES transaction_statuses(id) ON DELETE SET NULL
      )
    `)
    return
  }

  const colNames = cols.map((c) => String(c[1]))
  const idx = colNames.indexOf('category_id')
  const isRequired = idx !== -1 && Number(cols[idx][3]) === 1
  if (isRequired) return

  // Schema antigo (categoria opcional): recria exigindo categoria,
  // mantendo apenas transações com categoria válida.
  db.run(`
    CREATE TABLE transactions_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      notes TEXT,
      status_id INTEGER REFERENCES transaction_statuses(id) ON DELETE SET NULL
    )
  `)
  db.run(`
    INSERT INTO transactions_new (id, date, amount, wallet_id, category_id, notes, status_id)
    SELECT t.id, t.date, t.amount, t.wallet_id, t.category_id, t.notes, t.status_id
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
  `)
  db.run('DROP TABLE transactions')
  db.run('ALTER TABLE transactions_new RENAME TO transactions')
}

/** Cria triggers que mantêm o saldo da carteira sincronizado com as transações. */
function ensureTransactionTriggers(): void {
  const db = getDb()
  // Remove triggers antigos para aplicar as novas definições.
  db.run('DROP TRIGGER IF EXISTS trg_transactions_insert')
  db.run('DROP TRIGGER IF EXISTS trg_transactions_delete')
  db.run('DROP TRIGGER IF EXISTS trg_transactions_update')
  // Só atualiza o saldo quando a transação não tem status (status_id IS NULL).
  db.run(`
    CREATE TRIGGER trg_transactions_insert
    AFTER INSERT ON transactions
    BEGIN
      UPDATE wallets SET balance = balance + NEW.amount
      WHERE NEW.status_id IS NULL AND id = NEW.wallet_id;
    END
  `)
  db.run(`
    CREATE TRIGGER trg_transactions_delete
    AFTER DELETE ON transactions
    BEGIN
      UPDATE wallets SET balance = balance - OLD.amount
      WHERE OLD.status_id IS NULL AND id = OLD.wallet_id;
    END
  `)
  db.run(`
    CREATE TRIGGER trg_transactions_update
    AFTER UPDATE OF amount, wallet_id, status_id ON transactions
    BEGIN
      UPDATE wallets SET balance = balance - OLD.amount
      WHERE OLD.status_id IS NULL AND id = OLD.wallet_id;
      UPDATE wallets SET balance = balance + NEW.amount
      WHERE NEW.status_id IS NULL AND id = NEW.wallet_id;
    END
  `)
}

/** Cria o schema inicial e aplica migrações. */
export async function initDatabase(): Promise<void> {
  await initConnection()
  const db = getDb()

  db.run(`
    CREATE TABLE IF NOT EXISTS wallets_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT 1
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT 1
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS transaction_statuses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active BOOLEAN DEFAULT 1,
      color TEXT
    )
  `)

  // Garante o schema de wallets (associação por type_id, referenciando o id).
  ensureWalletsTable()

  // Garante o schema de transactions (categoria obrigatória).
  ensureTransactionsTable()

  // Cria os triggers que mantêm o saldo da carteira sincronizado.
  ensureTransactionTriggers()

  // Recalcula o saldo das carteiras a partir das transações sem status.
  db.run('UPDATE wallets SET balance = 0')
  db.run(`
    UPDATE wallets SET balance = COALESCE((
      SELECT SUM(amount) FROM transactions
      WHERE transactions.wallet_id = wallets.id AND status_id IS NULL
    ), 0)
  `)

  // Garante a coluna color em transaction_statuses (tabelas antigas).
  const tsCols = db.exec('PRAGMA table_info(transaction_statuses)')[0]?.values ?? []
  if (!tsCols.some((c) => String(c[1]) === 'color')) {
    db.run('ALTER TABLE transaction_statuses ADD COLUMN color TEXT')
  }

  // Converte datas antigas (dd/mm/yyyy) para dd/mm/yy.
  db.run(
    'UPDATE transactions SET date = substr(date, 1, 6) || substr(date, 9, 2) WHERE length(date) = 10'
  )

  // Habilita a validação de chaves estrangeiras.
  db.run('PRAGMA foreign_keys = ON')

  persist()
}
