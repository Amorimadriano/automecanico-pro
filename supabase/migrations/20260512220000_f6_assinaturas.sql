-- Migration: f6_assinaturas
-- Created at: 2026-05-12 22:00:00
-- Objetivo: Controle de assinaturas mensais com trial de 5 dias

CREATE TABLE IF NOT EXISTS public.assinaturas_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial', -- trial | ativo | vencido | cancelado
  trial_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_fim TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 days'),
  assinatura_inicio TIMESTAMPTZ,
  assinatura_vencimento TIMESTAMPTZ,
  valor_mensal NUMERIC(10,2) NOT NULL DEFAULT 79.90,
  ultimo_pagamento_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assinaturas_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own assinaturas_mecanico" ON public.assinaturas_mecanico
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS tg_assinaturas_mecanico_upd ON public.assinaturas_mecanico;
CREATE TRIGGER tg_assinaturas_mecanico_upd
  BEFORE UPDATE ON public.assinaturas_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Funcao para criar assinatura trial automaticamente ao registrar usuario
CREATE OR REPLACE FUNCTION public.criar_assinatura_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.assinaturas_mecanico (user_id, status, trial_inicio, trial_fim)
  VALUES (NEW.id, 'trial', now(), now() + interval '5 days');
  RETURN NEW;
END;
$$;

-- Trigger para criar trial quando um novo usuario e criado no auth
DROP TRIGGER IF EXISTS tg_criar_trial_novo_usuario ON auth.users;
CREATE TRIGGER tg_criar_trial_novo_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_assinatura_trial();

-- Funcao para verificar se assinatura esta ativa
CREATE OR REPLACE FUNCTION public.verificar_assinatura_ativa(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_status TEXT;
  v_trial_fim TIMESTAMPTZ;
  v_assinatura_vencimento TIMESTAMPTZ;
BEGIN
  SELECT status, trial_fim, assinatura_vencimento
  INTO v_status, v_trial_fim, v_assinatura_vencimento
  FROM public.assinaturas_mecanico
  WHERE user_id = p_user_id;

  IF v_status IS NULL THEN
    RETURN false;
  END IF;

  IF v_status = 'ativo' AND v_assinatura_vencimento > now() THEN
    RETURN true;
  END IF;

  IF v_status = 'trial' AND v_trial_fim > now() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- View para dashboard de assinaturas (admin)
CREATE OR REPLACE VIEW public.v_assinaturas_resumo_mecanico AS
SELECT
  a.id,
  a.user_id,
  u.email AS usuario_email,
  a.status,
  a.trial_inicio,
  a.trial_fim,
  a.assinatura_inicio,
  a.assinatura_vencimento,
  a.valor_mensal,
  CASE
    WHEN a.status = 'trial' THEN EXTRACT(DAY FROM (a.trial_fim - now()))
    WHEN a.status = 'ativo' THEN EXTRACT(DAY FROM (a.assinatura_vencimento - now()))
    ELSE 0
  END AS dias_restantes,
  a.created_at
FROM public.assinaturas_mecanico a
LEFT JOIN auth.users u ON a.user_id = u.id;
