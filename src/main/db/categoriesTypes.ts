import { queryAll, run } from './connection'
import { AppError } from '../../shared/errors'
import type { CategoryType, CategoryTypeInput } from '../../shared/types'

interface CategoryTypeRow {
  id: number
  name: string
  is_active: number
}

function toCategoryType(row: CategoryTypeRow): CategoryType {
  return {
    id: row.id,
    name: row.name,
    is_active: !!row.is_active
  }
}

export function listCategoryTypes(): CategoryType[] {
  const rows = queryAll<CategoryTypeRow>(
    'SELECT * FROM categories_types ORDER BY name COLLATE NOCASE ASC'
  )
  return rows.map(toCategoryType)
}

export function createCategoryType(input: CategoryTypeInput): CategoryType {
  const id = run('INSERT INTO categories_types (name, is_active) VALUES (?, ?)', [
    input.name.trim(),
    input.is_active ? 1 : 0
  ])
  const row = queryAll<CategoryTypeRow>(
    'SELECT * FROM categories_types WHERE id = ?',
    [id]
  )[0]
  return toCategoryType(row)
}

export function updateCategoryType(
  id: number,
  input: CategoryTypeInput
): CategoryType | undefined {
  run('UPDATE categories_types SET name = ?, is_active = ? WHERE id = ?', [
    input.name.trim(),
    input.is_active ? 1 : 0,
    id
  ])
  const row = queryAll<CategoryTypeRow>(
    'SELECT * FROM categories_types WHERE id = ?',
    [id]
  )[0]
  return row ? toCategoryType(row) : undefined
}

export function deleteCategoryType(id: number): boolean {
  const exists =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories_types WHERE id = ?',
      [id]
    )[0].n > 0
  if (!exists) return false

  // Impede excluir um tipo que esteja em uso por alguma categoria.
  const inUse =
    queryAll<{ n: number }>(
      'SELECT COUNT(*) AS n FROM categories WHERE type_id = ?',
      [id]
    )[0].n > 0
  if (inUse) throw new Error(AppError.CATEGORY_TYPE_IN_USE)

  run('DELETE FROM categories_types WHERE id = ?', [id])
  return true
}
