import { APP_CONFIG } from '../../../shared/config'

/** Ordenação genérica por nome (ignora acentos e maiúsculas). */

export function sortByName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, APP_CONFIG.locale, { sensitivity: 'base' })
}
