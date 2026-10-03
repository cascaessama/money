/** Códigos de erro da aplicação (compartilhados entre main e renderer). */
export enum AppError {
  TYPE_IN_USE = 'TIPO_EM_USO',
  CATEGORY_IN_USE = 'CATEGORIA_EM_USO',
  CATEGORY_TYPE_IN_USE = 'TIPO_CATEGORIA_EM_USO',
  WALLET_IN_USE = 'CARTEIRA_EM_USO',
  STATUS_IN_USE = 'STATUS_EM_USO',
  INVALID_DATA = 'INVALID_DATA'
}

/** Verifica se um erro lançado contém um código de erro da aplicação. */
export function isAppError(err: unknown, code: AppError): boolean {
  return String((err as { message?: string })?.message ?? '').includes(code)
}
