import { queryAll, run } from './connection'
import type { Category, CategoryInput } from '../../shared/types'

interface CategoryRow {
  id: number
  name: string
  is_active: number
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    is_active: !!row.is_active
  }
}

export function listCategories(): Category[] {
  const rows = queryAll<CategoryRow>(
    'SELECT * FROM categories ORDER BY name COLLATE NOCASE ASC'
  )
  return rows.map(toCategory)
}

export function createCategory(input: CategoryInput): Category {
  const id = run('INSERT INTO categories (name, is_active) VALUES (?, ?)', [
    input.name.trim(),
    input.is_active ? 1 : 0
  ])
  const row = queryAll<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id])[0]
  return toCategory(row)
}

export function updateCategory(
  id: number,
  input: CategoryInput
): Category | undefined {
  run(
    'UPDATE categories SET name = ?, is_active = ? WHERE id = ?',
    [input.name.trim(), input.is_active ? 1 : 0, id]
  )
  const row = queryAll<CategoryRow>('SELECT * FROM categories WHERE id = ?', [id])[0]
  return row ? toCategory(row) : undefined
}

export function deleteCategory(id: number): boolean {
  const exists =
    queryAll<{ n: number }>('SELECT COUNT(*) AS n FROM categories WHERE id = ?', [
      id
    ])[0].n > 0
  if (!exists) return false
  run('DELETE FROM categories WHERE id = ?', [id])
  return true
}
