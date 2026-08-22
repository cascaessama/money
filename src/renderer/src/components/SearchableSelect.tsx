import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChangeEvent, KeyboardEvent } from 'react'

export interface SelectOption {
  id: number
  name: string
  color?: string | null
}

/** Itens ativos + o selecionado atual (mesmo se inativo) para o combobox. */
export function toSelectOptions<
  T extends { id: number; name: string; is_active: boolean; color?: string | null }
>(all: T[], selectedId: number | null): SelectOption[] {
  const active = all.filter((x) => x.is_active)
  const sel = all.find((x) => x.id === selectedId)
  if (sel && !sel.is_active) active.push(sel)
  return active
}

interface SearchableSelectProps {
  options: SelectOption[]
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
  allowClear?: boolean
  registerCell?: (el: HTMLElement | null) => void
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
  onBlur?: () => void
}

interface DropdownPos {
  top: number
  left: number
  width: number
}

/** Combobox pesquisável estilo Excel: digita para filtrar as opções. */
export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione…',
  allowClear = false,
  registerCell,
  onKeyDown,
  onBlur
}: SearchableSelectProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const [pos, setPos] = useState<DropdownPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const selected = options.find((o) => o.id === value) ?? null
  const q = query.trim().toLowerCase()
  const filtered = q
    ? options.filter((o) => o.name.toLowerCase().includes(q))
    : options

  const setInputRef = (el: HTMLInputElement | null): void => {
    inputRef.current = el
    registerCell?.(el)
  }

  useEffect(() => {
    if (!open) return
    const scrollables: HTMLElement[] = []
    let node: HTMLElement | null = inputRef.current
    while (node) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
        scrollables.push(node)
      }
      node = node.parentElement
    }
    const close = (): void => setOpen(false)
    scrollables.forEach((n) => n.addEventListener('scroll', close))
    window.addEventListener('scroll', close, true)
    return () => {
      scrollables.forEach((n) => n.removeEventListener('scroll', close))
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function openDropdown(): void {
    const el = inputRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      setPos({ top: r.bottom + 4, left: r.left, width: r.width })
    }
    setQuery('')
    setHighlight(0)
    setOpen(true)
  }

  function selectOption(id: number | null): void {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    setQuery(e.target.value)
    setOpen(true)
    setHighlight(0)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>): void {
    if (open && filtered.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((h) => (h + 1) % filtered.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((h) => (h - 1 + filtered.length) % filtered.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const opt = filtered[Math.min(highlight, filtered.length - 1)]
        if (opt) selectOption(opt.id)
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        return
      }
    }
    onKeyDown?.(e)
  }

  function handleBlur(): void {
    setOpen(false)
    setQuery('')
    onBlur?.()
  }

  const display = open ? query : (selected?.name ?? '')

  return (
    <div className="searchable-select" ref={rootRef}>
      <input
        ref={setInputRef}
        className="select-input"
        value={display}
        placeholder={placeholder}
        onChange={handleChange}
        onFocus={openDropdown}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {allowClear && value != null && (
        <button
          type="button"
          className="select-clear"
          tabIndex={-1}
          onClick={() => selectOption(null)}
          title="Limpar"
        >
          ×
        </button>
      )}
      {open &&
        pos &&
        createPortal(
          <ul
            className="select-options"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {filtered.length === 0 ? (
              <li className="select-empty">Nenhuma opção</li>
            ) : (
              filtered.map((o, i) => (
                <li
                  key={o.id}
                  className={`select-option ${i === highlight ? 'highlighted' : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    selectOption(o.id)
                  }}
                  onMouseEnter={() => setHighlight(i)}
                >
                  <span
                    className="select-option-dot"
                    style={o.color ? { background: o.color } : undefined}
                  />
                  {o.name}
                </li>
              ))
            )}
          </ul>,
          document.body
        )}
    </div>
  )
}
