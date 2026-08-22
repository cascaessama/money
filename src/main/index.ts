import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import {
  initDatabase,
  listWalletTypes,
  createWalletType,
  updateWalletType,
  deleteWalletType,
  listWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listTransactionStatuses,
  createTransactionStatus,
  updateTransactionStatus,
  deleteTransactionStatus,
  listTransactions,
  createTransaction,
  createTransactions,
  updateTransaction,
  deleteTransaction,
  markTransactionsAsPaid,
  periodReport,
  exportBackup,
  importBackup
} from './db'

// Garante um caminho de dados único (userData) independentemente de como o app
// é iniciado. Sem isso, o Electron pode cair no nome genérico "Electron" e criar
// uma segunda pasta/banco (ex.: Application Support/Electron).
app.setName('money')

/** Registra os 4 handlers (list/create/update/delete) de um domínio de uma vez. */
function registerCrudHandlers<T, I>(
  prefix: string,
  impl: {
    list: () => T[]
    create: (input: I) => T
    update: (id: number, input: I) => T | undefined
    remove: (id: number) => boolean
  }
): void {
  const register = (action: string, fn: (...args: unknown[]) => unknown): void => {
    ipcMain.handle(`${prefix}:${action}`, (_e, ...args: unknown[]) => {
      try {
        return fn(...args)
      } catch (err) {
        console.error(`[IPC ${prefix}:${action}]`, err)
        throw err
      }
    })
  }
  register('list', () => impl.list())
  register('create', (input) => impl.create(input as I))
  register('update', (id, input) => impl.update(id as number, input as I))
  register('delete', (id) => impl.remove(id as number))
}

function registerIpcHandlers(): void {
  registerCrudHandlers('wallets-types', {
    list: listWalletTypes,
    create: createWalletType,
    update: updateWalletType,
    remove: deleteWalletType
  })
  registerCrudHandlers('wallets', {
    list: listWallets,
    create: createWallet,
    update: updateWallet,
    remove: deleteWallet
  })
  registerCrudHandlers('categories', {
    list: listCategories,
    create: createCategory,
    update: updateCategory,
    remove: deleteCategory
  })
  registerCrudHandlers('transaction-statuses', {
    list: listTransactionStatuses,
    create: createTransactionStatus,
    update: updateTransactionStatus,
    remove: deleteTransactionStatus
  })
  registerCrudHandlers('transactions', {
    list: listTransactions,
    create: createTransaction,
    update: updateTransaction,
    remove: deleteTransaction
  })
  ipcMain.handle('transactions:create-many', (_e, inputs) => {
    try {
      return createTransactions(inputs)
    } catch (err) {
      console.error('[IPC transactions:create-many]', err)
      throw err
    }
  })
  ipcMain.handle('transactions:mark-as-paid', (_e, input) => {
    try {
      return markTransactionsAsPaid(input)
    } catch (err) {
      console.error('[IPC transactions:mark-as-paid]', err)
      throw err
    }
  })
  ipcMain.handle('backup:export', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    try {
      const result = await dialog.showSaveDialog(win ?? undefined, {
        title: 'Exportar backup',
        defaultPath: `money-backup-${stamp}.db`,
        filters: [{ name: 'Banco de dados', extensions: ['db'] }]
      })
      if (result.canceled || !result.filePath) return { canceled: true }
      exportBackup(result.filePath)
      return { canceled: false, filePath: result.filePath }
    } catch (err) {
      console.error('[IPC backup:export]', err)
      throw err
    }
  })
  ipcMain.handle('backup:import', async () => {
    const win = BrowserWindow.getAllWindows()[0]
    try {
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Importar backup',
        filters: [{ name: 'Banco de dados', extensions: ['db'] }],
        properties: ['openFile']
      })
      if (result.canceled || !result.filePaths[0]) return { canceled: true }
      importBackup(result.filePaths[0])
      // Recarrega o banco em memória a partir do arquivo importado.
      await initDatabase()
      // Atualiza as janelas para buscar os dados novos (sem reiniciar o app).
      for (const w of BrowserWindow.getAllWindows()) w.webContents.reload()
      return { canceled: false }
    } catch (err) {
      console.error('[IPC backup:import]', err)
      throw err
    }
  })
  ipcMain.handle('reports:period', (_e, input) => {
    try {
      return periodReport(input)
    } catch (err) {
      console.error('[IPC reports:period]', err)
      throw err
    }
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 860,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Em desenvolvimento, o electron-vite serve o renderer via URL local
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  await initDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    // No macOS, recria a janela quando o ícone do dock é clicado
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // No macOS, apps costumam ficar ativos até o usuário sair explicitamente
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
