-- Migration: add_updated_at_triggers
-- Created at: 2026-05-12 18:00:01
-- Objetivo: Adicionar coluna updated_at + trigger em tabelas _mecanico que ainda nao possuem.

-- ============================================================
-- 1. funcionarios_mecanico
-- ============================================================
ALTER TABLE public.funcionarios_mecanico
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_funcionarios_mecanico_upd ON public.funcionarios_mecanico;
CREATE TRIGGER tg_funcionarios_mecanico_upd
  BEFORE UPDATE ON public.funcionarios_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 2. agendamentos_mecanico
-- ============================================================
ALTER TABLE public.agendamentos_mecanico
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_agendamentos_mecanico_upd ON public.agendamentos_mecanico;
CREATE TRIGGER tg_agendamentos_mecanico_upd
  BEFORE UPDATE ON public.agendamentos_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 3. financeiro_mecanico
-- ============================================================
ALTER TABLE public.financeiro_mecanico
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_financeiro_mecanico_upd ON public.financeiro_mecanico;
CREATE TRIGGER tg_financeiro_mecanico_upd
  BEFORE UPDATE ON public.financeiro_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 4. os_itens_mecanico
-- ============================================================
ALTER TABLE public.os_itens_mecanico
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS tg_os_itens_mecanico_upd ON public.os_itens_mecanico;
CREATE TRIGGER tg_os_itens_mecanico_upd
  BEFORE UPDATE ON public.os_itens_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
