-- Migration: f4_orcamentos
-- Created at: 2026-05-12 20:00:03
-- Objetivo: Criar tabelas de orcamentos (pre-OS) com sufixo _mecanico.

-- ============================================================
-- 1. orcamentos_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orcamentos_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero SERIAL,
  cliente_id UUID NOT NULL REFERENCES public.clientes_mecanico(id) ON DELETE RESTRICT,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos_mecanico(id) ON DELETE RESTRICT,
  funcionario_id UUID REFERENCES public.funcionarios_mecanico(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  descricao_problema TEXT,
  diagnostico TEXT,
  km_entrada INT,
  data_criacao TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_validade TIMESTAMPTZ,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pecas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_servicos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamentos_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own orcamentos_mecanico" ON public.orcamentos_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. orcamento_itens_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orcamento_itens_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  orcamento_id UUID NOT NULL REFERENCES public.orcamentos_mecanico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  peca_id UUID REFERENCES public.pecas_mecanico(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orcamento_itens_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own orcamento_itens_mecanico" ON public.orcamento_itens_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. CHECK constraints
-- ============================================================
ALTER TABLE public.orcamentos_mecanico
  ADD CONSTRAINT chk_orcamentos_mecanico_status
  CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'convertido'));

ALTER TABLE public.orcamento_itens_mecanico
  ADD CONSTRAINT chk_orcamento_itens_mecanico_tipo
  CHECK (tipo IN ('peca', 'servico'));

-- ============================================================
-- 4. Triggers updated_at
-- ============================================================
DROP TRIGGER IF EXISTS tg_orcamentos_mecanico_upd ON public.orcamentos_mecanico;
CREATE TRIGGER tg_orcamentos_mecanico_upd
  BEFORE UPDATE ON public.orcamentos_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS tg_orcamento_itens_mecanico_upd ON public.orcamento_itens_mecanico;
CREATE TRIGGER tg_orcamento_itens_mecanico_upd
  BEFORE UPDATE ON public.orcamento_itens_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5. Trigger numero por usuario (igual a OS)
-- ============================================================
ALTER TABLE public.orcamentos_mecanico
  ALTER COLUMN numero DROP DEFAULT;

DROP SEQUENCE IF EXISTS public.orcamentos_mecanico_numero_seq;

CREATE OR REPLACE FUNCTION public.set_orcamento_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    SELECT COALESCE(MAX(numero), 0) + 1
    INTO NEW.numero
    FROM public.orcamentos_mecanico
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_orcamentos_mecanico_numero
  ON public.orcamentos_mecanico;

CREATE TRIGGER tg_orcamentos_mecanico_numero
  BEFORE INSERT ON public.orcamentos_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_orcamento_numero();

-- ============================================================
-- 6. Indices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orcamentos_mecanico_user_status
  ON public.orcamentos_mecanico(user_id, status);

CREATE INDEX IF NOT EXISTS idx_orcamento_itens_mecanico_orcamento
  ON public.orcamento_itens_mecanico(orcamento_id);
