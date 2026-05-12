-- Migration: F2 Controle de Comissões por Funcionário
-- Created at: 2026-05-12 20:00:01

-- ============================================================
-- 1. Tabela comissoes_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comissoes_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios_mecanico(id) ON DELETE CASCADE,
  os_id UUID NOT NULL REFERENCES public.ordens_servico_mecanico(id) ON DELETE CASCADE,
  valor_total_servicos NUMERIC(12,2) NOT NULL,
  percentual NUMERIC(5,2) NOT NULL,
  valor_comissao NUMERIC(12,2) NOT NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.comissoes_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own comissoes_mecanico" ON public.comissoes_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. Trigger para criar comissão automaticamente quando OS é concluída
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_comissao_os_concluida()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_percentual NUMERIC(5,2);
BEGIN
  -- Só processa quando o status muda para 'concluida'
  IF NEW.status = 'concluida' AND (OLD.status IS NULL OR OLD.status <> 'concluida') THEN
    -- Só cria comissão se houver funcionário vinculado
    IF NEW.funcionario_id IS NOT NULL THEN
      -- Busca percentual do funcionário (padrão 0 se nulo)
      SELECT COALESCE(comissao_percent, 0) INTO v_percentual
      FROM public.funcionarios_mecanico
      WHERE id = NEW.funcionario_id;

      -- Só insere se houver total_servicos > 0
      IF NEW.total_servicos > 0 THEN
        INSERT INTO public.comissoes_mecanico (
          user_id,
          funcionario_id,
          os_id,
          valor_total_servicos,
          percentual,
          valor_comissao
        ) VALUES (
          NEW.user_id,
          NEW.funcionario_id,
          NEW.id,
          NEW.total_servicos,
          v_percentual,
          ROUND(NEW.total_servicos * (v_percentual / 100), 2)
        )
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_criar_comissao_os_concluida ON public.ordens_servico_mecanico;

CREATE TRIGGER tg_criar_comissao_os_concluida
  AFTER UPDATE OF status ON public.ordens_servico_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_comissao_os_concluida();

-- ============================================================
-- 3. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_comissoes_mecanico_funcionario
  ON public.comissoes_mecanico(funcionario_id);

CREATE INDEX IF NOT EXISTS idx_comissoes_mecanico_os
  ON public.comissoes_mecanico(os_id);

CREATE INDEX IF NOT EXISTS idx_comissoes_mecanico_user_pago
  ON public.comissoes_mecanico(user_id, pago);
