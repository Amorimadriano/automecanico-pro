# Contexto e Decisoes

## Decisoes de Arquitetura
1. File-based routing: Escolhido TanStack Router por conveniencia e type-safety.
2. Supabase RLS: Todas as tabelas possuem RLS por `user_id`, garantindo isolamento multi-tenant simples.
3. shadcn/ui: Adotado para velocidade de desenvolvimento e consistencia visual.
4. Tailwind v4: Usado pela DX aprimorada e performance.
5. Cloudflare: Plugin do Vite configurado para deploy na edge.

## Padroes Estabelecidos
- Hooks customizados em `src/hooks/`
- Integracoes externas em `src/integrations/`
- Componentes de UI em `src/components/ui/`
- Rotas em `src/routes/`
- Tipos do Supabase em `src/integrations/supabase/types.ts`
- Formularios: HTML5 native + FormData + Object.fromEntries
- Fetching: useEffect imperativo com `supabase.from()` + load() manual apos mutacoes
- Toasts: sonner (`toast.success` / `toast.error`)
- Confirmacoes: native `confirm()` para acoes destrutivas

## Time de Sub-Agentes Especializados
| Agente | Especialidade | Escopo |
|--------|---------------|--------|
| `frontend-dev` | React + TanStack Router + Tailwind + shadcn/ui | Componentes, rotas, hooks, UI/UX |
| `backend-dev` | Supabase JS + Auth + Middleware | Clientes supabase, auth, middleware, SSR |
| `database-architect` | Postgres + Migrations + RLS | Schema, indices, triggers, policies, tipos |
| `security-reviewer` | Auth + RLS + Secrets | Seguranca em todas as camadas |
| `qa-tester` | Testes + Qualidade + Regressoes | Verificar funcionalidades apos mudancas |

## Pontos de Atencao
- Nomenclatura de tabelas: `clientes` vs `clientes_oficina` precisa de alinhamento URGENTE.
- TypeScript types podem estar desatualizados em relacao as migrations.
- O projeto usa bun e npm (bun.lockb + package-lock.json).
- Dark mode only (`.dark` hardcoded no root).
- Mobile-first responsivo com sidebar/desktop + bottom nav/mobile.
