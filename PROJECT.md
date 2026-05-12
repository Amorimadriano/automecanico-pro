# Visão do Projeto

## AutoMecânico Pro — ERP para Oficinas Mecânicas

Sistema completo de gestão para oficinas mecânicas, permitindo controle de:
- Clientes e seus veículos
- Ordens de serviço (OS) com peças e serviços
- Estoque de peças
- Funcionários/mecânicos
- Agenda de atendimentos
- Financeiro (receitas e despesas)
- Geração de PDFs

## Stack Tecnológica
- **Framework:** React 19 + TanStack Router/Start (file-based routing)
- **Build:** Vite 7 + @cloudflare/vite-plugin (deploy CF)
- **UI:** TailwindCSS v4 + shadcn/ui (components/ui/)
- **Backend-as-a-Service:** Supabase (Postgres + Auth + RLS)
- **Formulários:** React Hook Form + Zod + @hookform/resolvers
- **PDF:** jsPDF + jspdf-autotable
- **Gráficos:** Recharts
- **Carrossel:** Embla Carousel
- **Date/Time:** date-fns
- **State/Query:** TanStack Query
- **Auth:** Supabase Auth via hooks/useAuth.ts + middleware

## Arquitetura
- File-based routing via TanStack Router (`src/routes/`)
- Layout protegido em `/app` com sidebar e mobile bar
- RLS em todas as tabelas (`user_id = auth.uid()`)
- Auth middleware para SSR/server requests
- Type-safe Supabase client com tipos gerados em `src/integrations/supabase/types.ts`

## Escopo Atual
- 8 módulos funcionando: Dashboard, Clientes, Veículos, OS, Estoque, Funcionários, Agenda, Financeiro
- Login com Supabase Auth
- Relacionamentos completos entre entidades
