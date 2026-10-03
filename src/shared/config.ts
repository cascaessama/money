/**
 * Configurações fixas do aplicativo.
 *
 * Este é o único lugar onde ficam os valores fixos ("hardcode") de regra de
 * negócio. Edite o que precisar — o app passa a usar o novo valor na próxima
 * execução.
 *
 * ---------------------------------------------------------------------------
 * REGRAS ESTRUTURAIS (não são configuráveis aqui):
 *
 *  - Datas: sempre no formato "dd/mm/aa". O banco guarda a data como texto e
 *    ordena/filtra recortando essa string (substr). Trocar o formato quebraria
 *    relatórios, filtros e ordenação.
 *
 *  - Sinal do valor: amount > 0 = entrada (recebido); amount < 0 = saída
 *    (gasto). O sinal é digitado pelo usuário; não existe "tipo" de transação.
 *
 *  - Status realizado: transação SEM status (status_id NULL) entra no saldo da
 *    carteira; transação COM status não entra (é tratada como prevista). Essa
 *    regra está gravada nos triggers do banco.
 * ---------------------------------------------------------------------------
 */

export const APP_CONFIG = {
  /** Categorias tratadas como transferência entre contas: ficam fora do
   *  relatório de receitas/despesas (não contam como crédito nem débito).
   *  A comparação ignora maiúsculas/minúsculas e espaços nas pontas. */
  transferCategoryNames: ['entre contas', 'transferência', 'transferencia'],

  /** Status somados como "Previsto" (a receber/a pagar) no relatório. */
  previstoStatusNames: ['agendado', 'pagar', 'receber'],

  /** Status padrão "Devo" (pré-selecionado na tela de Recorrência). */
  devoStatusName: 'devo',

  /** Status usado pelo botão "marcar como pago" na tela de Crédito. */
  paidStatusName: 'pago',

  /** Trecho (em minúsculas) que identifica uma carteira de crédito no nome do
   *  seu tipo. Ex.: o tipo "Cartão de crédito" contém "crédito". */
  creditWalletTypeMatch: 'crédito',

  /** Tipo de categoria padrão criado/usado ao migrar bancos antigos. */
  defaultCategoryTypeName: 'Necessário',

  /** Nome do arquivo do banco (dentro da pasta de dados do app). */
  databaseFileName: 'money.db',

  /** Século somado aos anos de 2 dígitos (aa -> 20aa). */
  centuryBase: 2000,

  /** Localidade e moeda usadas na formatação e na ordenação. */
  locale: 'pt-BR',
  currency: 'BRL',

  /** Itens por página nas listas (Transações e Crédito). */
  pageSize: 20,

  /** Cor padrão de um novo status de transação. */
  defaultStatusColor: '#2d6cdf',

  /** Cor exibida quando um status não tem cor definida. */
  defaultStatusColorFallback: '#000000',

  /** Recorrência: quantidade pré-preenchida e quantidade mínima aceita. */
  recurringDefaultQuantity: 2,
  recurringMinQuantity: 2
}
