<div align="center">

# 💰 Money

**Controle financeiro pessoal — simples, rápido e local.**

Uma aplicação de desktop construída com **Electron + React + TypeScript**. Seus dados ficam **somente no seu computador**, em um arquivo local de SQLite — sem nuvem, sem servidor, sem depender da internet.

![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-sql.js-003B57?logo=sqlite&logoColor=white)
![Plataformas](https://img.shields.io/badge/macOS%20•%20Windows%20•%20Linux-✔-informational)

</div>

---

## ✨ Visão geral

O **Money** organiza suas finanças em carteiras e transações, com categorias, status e relatórios por período. O visual é inspirado em apps de banco: limpo, direto e focado em deixar você ver **para onde o dinheiro vai**.

> **Privacidade em primeiro lugar:** tudo fica no seu disco. O banco de dados é um único arquivo em `~/Library/Application Support/money/money.db` — e há uma tela de **Backup** para você exportar/restaurar esse arquivo com segurança.

---

## 🧭 Fluxos de cada tela

> O menu lateral (e os atalhos `Cmd+0..9` / `Ctrl+0..9`) leva você a cada tela. Em macOS use `Cmd`; em Windows/Linux, `Ctrl`.

### 📊 Relatório — `Cmd + 0`
Resumo do que entrou e saiu em um período.

- Abre já com o **mês atual** (dia 1 até o **último dia do mês**).
- Filtros: **Data início**, **Data fim**, **Categoria** e **Status** — aplique com **Aplicar** ou volte ao padrão com **Limpar**.
- **Cards do topo:** Recebido, Gasto, Saldo do período, Previsto, Saldo − Previsto, Devo e total de transações — com **comparativo % vs. o mês anterior**.
- **Por categoria:** cada categoria com Recebido, Gasto, %, Saldo e quantidade. Clique no nome para **ver as transações** da categoria (modal).
- **Por status:** total e quantidade por status.
- > 💡 Transferências entre contas (categoria **"Entre contas"**) **não** contam como receita nem despesa.

### 💸 Transações — `Cmd + 1`
Cadastro e edição de lançamentos, com edição **estilo planilha**.

- **Campos:** Data, Valor, Carteira, Categoria, Observações e Status.
- **Edição rápida:** Data, Valor e Observações são editados direto na célula (com máscara de data e formatação de moeda BR).
- **Comboboxes pesquisáveis** para Carteira, Categoria e Status.
- **Filtros por coluna** em cada cabeçalho e **segmentação por status** (clique nos chips para ocultar/mostrar).
- **Paginação** e atalho para **+ Nova transação**.
- O **saldo das carteiras** é atualizado automaticamente.

### 💳 Crédito — `Cmd + 2`
Visão **somente leitura** das transações ligadas a carteiras de **crédito** (tipos que contêm "crédito"). Mesmos filtros, segmentação e paginação das Transações.

### 🔁 Recorrência — `Cmd + 3`
Crie uma transação **repetida mensalmente** de uma vez só (ex.: parcelas de cartão de crédito).

- Mesmos campos de uma transação **+ campo Quantidade** (mínimo 2).
- **Status padrão:** "Devo" (pré-selecionado).
- Ao preencher, uma **prévia** mostra todas as datas que serão geradas.
- Ao confirmar, insere N transações com **+1 mês** a cada repetição. Ex.: `28/11/26` + 3 → `28/11`, `28/12`, `28/01`.
- Se o dia não existir no mês seguinte (ex.: `31/01`), **ajusta para o último dia** do mês.
- Após salvar, o foco volta para o campo **Data** para agilizar o próximo lançamento.

### 🏷️ Categorias — `Cmd + 4`
CRUD das categorias usadas nas transações (nome, **tipo de categoria** e ativo/inativo).

> Cada categoria pertence a um **tipo de categoria** (obrigatório). Categorias em uso por transações **não podem ser excluídas**.

### 🏷️ Tipos de Categoria — `Cmd + 5`
CRUD dos tipos de categoria (ex.: Necessário, Desejos, Investimentos). Tipos em uso por alguma categoria **não podem ser excluídos**.

### 💳 Carteiras — `Cmd + 6`
CRUD das carteiras (contas/cartões), com **saldo** atualizado automaticamente pelas transações e tipo de carteira.

### 🗂️ Tipos de Carteira — `Cmd + 7`
CRUD dos tipos de carteira (ex.: Conta Corrente, Cartão de Crédito, Poupança). Tipos em uso **não podem ser excluídos**.

### 📌 Status de Transação — `Cmd + 8`
CRUD dos status (ex.: Pago, Devo, Receber), com cor opcional para visualização.

### 💾 Backup — `Cmd + 9`
Proteja seus dados.

- **💾 Exportar backup:** salva o banco em um arquivo `.db` no local que você escolher (HD externo, iCloud, Dropbox…).
- **📥 Importar backup:** restaura a partir de um arquivo — o app valida o arquivo e **atualiza a tela** com os dados restaurados (sem fechar o app).

---

## ⌨️ Atalhos de teclado

| Atalho | Tela |
|--------|------|
| `Cmd/Ctrl + 0` | Relatório |
| `Cmd/Ctrl + 1` | Transações |
| `Cmd/Ctrl + 2` | Crédito |
| `Cmd/Ctrl + 3` | Recorrência |
| `Cmd/Ctrl + 4` | Categorias |
| `Cmd/Ctrl + 5` | Tipos de Categoria |
| `Cmd/Ctrl + 6` | Carteiras |
| `Cmd/Ctrl + 7` | Tipos de Carteira |
| `Cmd/Ctrl + 8` | Status de Transação |
| `Cmd/Ctrl + 9` | Backup |

---

## 🗄️ Onde ficam os dados

O banco de dados é um **único arquivo SQLite** fora do código do app:

```
~/Library/Application Support/money/money.db   (macOS)
%APPDATA%/money/money.db                        (Windows)
~/.config/money/money.db                        (Linux)
```

- Os dados **não** vão para o git e **não** saem do seu computador.
- Cada usuário tem o **próprio** banco.
- O arquivo sobrevive a **atualizações** do app.
- Use a tela de **Backup** para exportar/importar antes de formatar ou trocar de máquina.
- O nome do arquivo (`money.db`) é configurável em `src/shared/config.ts` (`databaseFileName`).

---

## ⚙️ Configurações fixas

Todas as regras de negócio que eram "hardcode" ficam em um único arquivo:

**`src/shared/config.ts`** → objeto `APP_CONFIG`.

Edite os valores e rode o app novamente (em modo `dev`, o hot reload já aplica).

| Configuração | Padrão | O que faz |
|--------------|--------|-----------|
| `transferCategoryNames` | `entre contas`, `transferência`, `transferencia` | Categorias tratadas como transferência entre contas: ficam **fora** do relatório (não contam como receita nem despesa). |
| `previstoStatusNames` | `agendado`, `pagar`, `receber` | Status somados como **Previsto** (saldo projetado) no relatório. |
| `devoStatusName` | `devo` | Status **"Devo"**: pré-selecionado na Recorrência e somado no relatório. |
| `paidStatusName` | `pago` | Status usado pelo botão **"marcar como pago"** na tela de Crédito. |
| `creditWalletTypeMatch` | `crédito` | Trecho que identifica uma carteira de **crédito** no nome do tipo (ex.: "Cartão de crédito"). |
| `defaultCategoryTypeName` | `Necessário` | Tipo de categoria padrão criado/usado ao migrar bancos antigos. |
| `databaseFileName` | `money.db` | Nome do arquivo do banco dentro da pasta de dados do app. |
| `centuryBase` | `2000` | Século somado aos anos de 2 dígitos (aa → 20aa). |
| `locale` / `currency` | `pt-BR` / `BRL` | Localidade e moeda da formatação e da ordenação. |
| `pageSize` | `20` | Itens por página nas listas (Transações e Crédito). |
| `defaultStatusColor` | `#2d6cdf` | Cor padrão de um novo status de transação. |
| `defaultStatusColorFallback` | `#000000` | Cor exibida quando um status não tem cor definida. |
| `recurringDefaultQuantity` / `recurringMinQuantity` | `2` / `2` | Quantidade pré-preenchida e quantidade mínima na tela de Recorrência. |

### Regras estruturais (não configuráveis)

Estas estão gravadas no banco/código e **não** mudam pelo arquivo de configuração:

- **Formato de data:** sempre `dd/mm/aa` (o banco guarda texto e ordena recortando a string).
- **Sinal do valor:** positivo = entrada (recebido); negativo = saída (gasto).
- **Status realizado:** transação **sem** status entra no saldo da carteira; **com** status não entra (é tratada como prevista).

---

## 🚀 Como rodar

Requisitos: **Node.js 18+** e **npm**.

```bash
npm install        # instala dependências (aplica o fix do macOS no Electron)
npm run dev        # abre o app em modo desenvolvimento (hot reload)
```

Outros comandos:

```bash
npm run typecheck   # valida os tipos TypeScript
npm run build       # gera os arquivos de build em out/
npm run build:mac   # gera o app nativo (dmg) para macOS
npm run build:win   # gera o instalador para Windows
npm run build:linux # gera o AppImage/deb para Linux

# macOS: gera o dmg, instala em /Applications, assina com certificado local
# (auto-assinado) e remove a quarentena — evita o aviso de "malware" ao abrir.
npm run build:mac:noquarantine
```

---

## 🧱 Stack & estrutura

| Camada | Tecnologia |
|--------|-----------|
| Desktop | **Electron** |
| UI | **React** + **TypeScript** |
| Build | **electron-vite** |
| Dados | **sql.js** (SQLite em arquivo único) |
| Empacotamento | **electron-builder** |

```
src/
├── main/        # Processo principal do Electron + banco de dados
│   └── db/      # Migrações e CRUDs (categorias, carteiras, transações, etc.)
├── preload/     # Ponte segura entre o processo principal e a interface
├── renderer/    # Interface React (telas, componentes, hooks, estilos)
└── shared/      # Tipos, validações, erros e configurações (config.ts)
```

---

## 📄 Licença

MIT
