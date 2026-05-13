-- Migration: f9_alinhamento_clientes
-- Created at: 2026-05-13
-- Objetivo: Garantir que clientes_mecanico contenha todos os dados de clientes_oficina
--            e verificar consistencia entre tabelas antigas e novas.

-- ============================================================
-- 1. Migra dados de clientes_oficina para clientes_mecanico
-- ============================================================
INSERT INTO public.clientes_mecanico (
  id, user_id, nome, telefone, email, documento, endereco, observacoes, created_at, updated_at
)
SELECT
  id, user_id, nome, telefone, email, documento, endereco, observacoes, created_at, updated_at
FROM public.clientes_oficina co
WHERE NOT EXISTS (
  SELECT 1 FROM public.clientes_mecanico cm WHERE cm.id = co.id
);

-- ============================================================
-- 2. Contagem para log
-- ============================================================
DO $$
DECLARE
  v_count_old INT;
  v_count_new INT;
  v_count_migrated INT;
BEGIN
  SELECT COUNT(*) INTO v_count_old FROM public.clientes_oficina;
  SELECT COUNT(*) INTO v_count_new FROM public.clientes_mecanico;

  v_count_migrated := v_count_new - (SELECT COUNT(*) FROM public.clientes_mecanico cm
    WHERE EXISTS (SELECT 1 FROM public.clientes_oficina co WHERE co.id = cm.id));

  RAISE NOTICE 'Tabela clientes_oficina: % registros', v_count_old;
  RAISE NOTICE 'Tabela clientes_mecanico: % registros', v_count_new;
  RAISE NOTICE 'Registros migrados nesta execucao: %', v_count_migrated;
END $$;

-- ============================================================
-- 3. Garante RLS e policy em clientes_mecanico
-- ============================================================
ALTER TABLE public.clientes_mecanico ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own clientes_mecanico" ON public.clientes_mecanico
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 4. Garante trigger updated_at em clientes_mecanico
-- ============================================================
DROP TRIGGER IF EXISTS tg_clientes_mecanico_upd ON public.clientes_mecanico;
CREATE TRIGGER tg_clientes_mecanico_upd
  BEFORE UPDATE ON public.clientes_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
