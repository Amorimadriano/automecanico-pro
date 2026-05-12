-- Migration: add_check_constraints
-- Created at: 2026-05-12 18:00:00
-- Objetivo: Adicionar CHECK constraints em colunas enum das tabelas _mecanico.

-- ============================================================
-- 1. ordens_servico_mecanico.status
-- ============================================================
ALTER TABLE public.ordens_servico_mecanico
  ADD CONSTRAINT chk_ordens_servico_mecanico_status
  CHECK (status IN ('aberta', 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada'));

-- ============================================================
-- 2. os_itens_mecanico.tipo
-- ============================================================
ALTER TABLE public.os_itens_mecanico
  ADD CONSTRAINT chk_os_itens_mecanico_tipo
  CHECK (tipo IN ('peca', 'servico'));

-- ============================================================
-- 3. agendamentos_mecanico.status
-- ============================================================
ALTER TABLE public.agendamentos_mecanico
  ADD CONSTRAINT chk_agendamentos_mecanico_status
  CHECK (status IN ('agendado', 'concluido', 'cancelado'));

-- ============================================================
-- 4. financeiro_mecanico.tipo
-- ============================================================
ALTER TABLE public.financeiro_mecanico
  ADD CONSTRAINT chk_financeiro_mecanico_tipo
  CHECK (tipo IN ('receita', 'despesa'));
