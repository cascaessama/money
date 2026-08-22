import { useCallback, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

export interface ExcelGridOptions {
  /** Campos de uma linha normal, na ordem de navegação. Ex.: ['name', 'type', 'status'] */
  fields: string[]
  /** Campos da linha "nova" (opcional). Ex.: ['name', 'type'] */
  newFields?: string[]
  /** Se a linha "nova" está sendo exibida. */
  creating: boolean
  /** Ids das linhas existentes, na ordem atual. */
  rowKeys: (string | number)[]
  /** Nome do campo de texto único (padrão 'name'). */
  textField?: string
  /** Alternativo ao textField: vários campos de texto editáveis. */
  textFields?: string[]
  /** Salva a edição de um texto de uma linha existente. */
  onCommitText: (rowKey: string, field: string, value: string) => void | Promise<void>
  /** Cria o registro da linha "nova". Retorna o id criado (se houver). */
  onCommitNew: () => number | void | Promise<number | void>
  /** Cancela a linha "nova". */
  onCancelNew: () => void
}

interface Editing {
  cellKey: string
  value: string
}

/**
 * Lógica compartilhada de edição/navegação "estilo Excel" entre telas de CRUD:
 * - Navegação por Tab/Shift+Tab por todas as células (incluindo a linha nova).
 * - Edição de célula de texto com commit em Enter/blur/saída.
 * - Supressão de blur durante navegação (evita salvamento duplo).
 */
export function useExcelGrid(opts: ExcelGridOptions) {
  const textFields = opts.textFields ?? [opts.textField ?? 'name']
  const [editing, setEditing] = useState<Editing | null>(null)
  const committingRef = useRef(false)
  const cellRefs = useRef<Record<string, HTMLElement | null>>({})

  const isNew = (key: string) => key.startsWith('new:')
  const rowKeyOf = (key: string) => key.split(':')[0]
  const fieldOf = (key: string) => key.split(':')[1]

  const registerCell = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) cellRefs.current[key] = el
    },
    []
  )

  const orderedCells = useCallback((): string[] => {
    const cells: string[] = []
    if (opts.creating) {
      for (const f of opts.newFields ?? []) cells.push(`new:${f}`)
    }
    for (const id of opts.rowKeys) {
      for (const f of opts.fields) cells.push(`${id}:${f}`)
    }
    return cells
  }, [opts.creating, opts.newFields, opts.rowKeys, opts.fields])

  const focusCell = useCallback((key: string) => {
    cellRefs.current[key]?.focus()
  }, [])

  /** Foca o primeiro campo da linha nova (chamado ao criar). */
  const focusNewName = useCallback(() => {
    if (opts.newFields?.length) {
      requestAnimationFrame(() => focusCell(`new:${opts.newFields![0]}`))
    }
  }, [focusCell, opts.newFields])

  /** Confirma a edição de um texto de uma linha existente. */
  const commitText = useCallback(
    (key: string, value?: string) => {
      if (!editing || editing.cellKey !== key) return
      const finalValue = (value ?? editing.value).trim()
      setEditing(null)
      if (finalValue) opts.onCommitText(rowKeyOf(key), fieldOf(key), finalValue)
    },
    [editing, opts]
  )

  const handleBlur = useCallback(
    (key: string, value?: string) => {
      if (committingRef.current) {
        committingRef.current = false
        return
      }
      if (isNew(key)) opts.onCommitNew()
      else commitText(key, value)
    },
    [commitText, opts]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>, key: string) => {
      const newCell = isNew(key)
      if (e.key === 'Enter') {
        e.preventDefault()
        committingRef.current = true
        if (newCell) opts.onCommitNew()
        else commitText(key)
        e.currentTarget.blur()
        committingRef.current = false
      } else if (e.key === 'Escape') {
        if (newCell) opts.onCancelNew()
        else setEditing(null)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        const cells = orderedCells()
        const idx = cells.indexOf(key)
        const ni = e.shiftKey
          ? (idx - 1 + cells.length) % cells.length
          : (idx + 1) % cells.length
        const target = cells[ni]
        committingRef.current = true

        if (newCell) {
          const lastNewIdx = (opts.creating ? (opts.newFields?.length ?? 0) : 0) - 1
          const leavingNewRow = !e.shiftKey && idx === lastNewIdx
          if (leavingNewRow) {
            // Último campo da linha nova: salva o registro.
            const p = opts.onCommitNew()
            if (isNew(target) && p && typeof (p as Promise<number | void>).then === 'function') {
              // Primeiro registro (sem existentes): após salvar, foca o registro criado.
              ;(p as Promise<number | void>).then((id) => {
                if (id != null) {
                  requestAnimationFrame(() => {
                    cellRefs.current[`${id}:${opts.fields[0]}`]?.focus()
                  })
                }
              })
              committingRef.current = false
              return
            }
          }
        } else if (textFields.includes(fieldOf(key))) {
          commitText(key)
        }

        focusCell(target)
        committingRef.current = false
      }
    },
    [orderedCells, focusCell, commitText, opts, textFields]
  )

  /** Handler de teclado para qualquer célula (select, toggle, linha nova). */
  const gridKeyDown = useCallback(
    (key: string) => (e: KeyboardEvent<HTMLElement>) => handleKeyDown(e, key),
    [handleKeyDown]
  )

  /** Renderiza uma célula de texto editável. */
  const textCell = useCallback(
    (
      rowKey: string | number,
      field: string,
      displayValue: string,
      placeholder: string,
      mask?: (raw: string) => string,
      blurMask?: (raw: string) => string
    ): ReactNode => {
      const cellKey = `${rowKey}:${field}`
      const isActive = editing !== null && editing.cellKey === cellKey
      const cls = `cell-input${isActive ? ' is-editing' : ''}`
      const value = isActive && editing ? editing.value : displayValue
      return (
        <input
          ref={registerCell(cellKey)}
          className={cls}
          value={value}
          readOnly={!isActive}
          placeholder={placeholder}
          onChange={(e) => {
            if (isActive && editing) {
              const raw = e.target.value
              setEditing({ ...editing, value: mask ? mask(raw) : raw })
            }
          }}
          onFocus={() => {
            if (!isActive) setEditing({ cellKey, value: displayValue })
          }}
          onBlur={() => {
            if (editing && editing.cellKey === cellKey) {
              const raw = editing.value
              const final = blurMask ? blurMask(raw) : raw
              if (final !== raw) {
                setEditing({ ...editing, value: final })
                handleBlur(cellKey, final)
                return
              }
            }
            handleBlur(cellKey)
          }}
          onKeyDown={(e) => handleKeyDown(e, cellKey)}
        />
      )
    },
    [editing, registerCell, handleBlur, handleKeyDown]
  )

  return {
    editing,
    textCell,
    registerCell,
    gridKeyDown,
    focusNewName,
    handleBlur
  }
}
