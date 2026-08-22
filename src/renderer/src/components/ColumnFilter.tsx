interface ColumnFilterProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

/** Input de filtro exibido dentro do cabeçalho de uma coluna de texto. */
export default function ColumnFilter({
  value,
  onChange,
  placeholder = 'Filtrar…'
}: ColumnFilterProps): JSX.Element {
  return (
    <input
      className="column-filter"
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
