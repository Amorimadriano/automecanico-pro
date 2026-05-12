# Estado Atual — 2026-05-12

## Branch: main
- Commits recentes: Update site info, ERP completo criado
- Status: funcional, com migrations recentes nao commitadas

## Migrations pendentes/modificadas
- `supabase/migrations/20260501210658_b74095f8-00f5-4126-a8ba-3c555f391dc0.sql` — schema principal (modificado, renomeou `clientes` → `clientes_oficina`)

## Arquivos untracked/modified
- `.env.temp` (untracked) — **CONTEM CHAVE ANON VIVA, DELETAR**
- `.env` (modified) — contem publishable key e URL do Supabase
- Migration supabase modificada

## Funcionalidades Implementadas
- Login/Logout com Supabase Auth
- Dashboard com KPIs, grafico de faturamento, alertas de estoque, proximos agendamentos
- Cadastro completo de clientes (`clientes_oficina`), veiculos, funcionarios, pecas
- Ordens de servico com itens (pecas e servicos), workflow de status, calculo automatico de totais
- Agenda de atendimentos (futuro + historico)
- Financeiro com contas a pagar/receber, lancamento automatico ao concluir OS
- Geracao de PDF da OS via jsPDF + autotable

## Problemas Criticos Identificados
1. `clientes` vs `clientes_oficina`: migration renomeou a tabela, mas `types.ts` ainda referencia `clientes`. Isso quebra type safety e pode quebrar queries em runtime.
2. Auth middleware dead code: `requireSupabaseAuth` em `auth-middleware.ts` nunca e importado/aplicado em nenhuma rota.
3. Protecao 100% client-side: `/app/*` so redireciona no browser apos hydrate. Nao ha server-side guards.
4. `.env.temp` expoe chave anon de outro projeto Supabase.
5. `SUPABASE_SERVICE_ROLE_KEY` ausente no `.env` — `client.server.ts` vai crashar em runtime.
6. Sem CHECK constraints em colunas enum (`status`, `tipo`, etc.) no banco.
7. Serial `numero` da OS e global (nao por usuario).
8. Sem TanStack Query — todo fetch e imperativo via useEffect + useState, sem cache/optimistic updates.

## Debitos Tecnicos
- Nome do package.json ainda e `tanstack_start_ts`
- `bun.lockb` e `package-lock.json` simultaneos
- `funcionarios`, `agendamentos`, `financeiro`, `os_itens` nao tem trigger de `updated_at`
