-- Migration: f6_assinaturas_renovacao
-- Created at: 2026-05-13
-- Objetivo: Adiciona campo proxima_cobranca e funcao de renovar assinatura

-- Adiciona campo proxima_cobranca
ALTER TABLE public.assinaturas_mecanico
ADD COLUMN IF NOT EXISTS proxima_cobranca TIMESTAMPTZ;

-- Funcao para renovar assinatura (chamada apos confirmacao de pagamento)
CREATE OR REPLACE FUNCTION public.renovar_assinatura(p_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.assinaturas_mecanico
  SET
    status = 'ativo',
    assinatura_inicio = COALESCE(assinatura_inicio, now()),
    assinatura_vencimento = now() + interval '30 days',
    proxima_cobranca = now() + interval '30 days',
    ultimo_pagamento_id = COALESCE(ultimo_pagamento_id, 'manual_' || now()::text)
  WHERE user_id = p_user_id;
END;
$$;

-- Funcao para verificar e bloquear assinaturas vencidas (pode ser chamada por cron ou edge function)
CREATE OR REPLACE FUNCTION public.verificar_assinaturas_vencidas()
RETURNS TABLE(user_id UUID, email TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE public.assinaturas_mecanico a
  SET status = 'vencido'
  FROM auth.users u
  WHERE a.user_id = u.id
    AND a.status IN ('ativo', 'trial')
    AND (
      (a.status = 'ativo' AND a.assinatura_vencimento < now())
      OR (a.status = 'trial' AND a.trial_fim < now())
    )
  RETURNING a.user_id, u.email;
END;
$$;

-- View atualizada com proxima_cobranca
DROP VIEW IF EXISTS public.v_assinaturas_resumo_mecanico;
CREATE VIEW public.v_assinaturas_resumo_mecanico AS
SELECT
  a.id,
  a.user_id,
  u.email AS usuario_email,
  a.status,
  a.trial_inicio,
  a.trial_fim,
  a.assinatura_inicio,
  a.assinatura_vencimento,
  a.proxima_cobranca,
  a.valor_mensal,
  CASE
    WHEN a.status = 'trial' THEN EXTRACT(DAY FROM (a.trial_fim - now()))
    WHEN a.status = 'ativo' THEN EXTRACT(DAY FROM (a.assinatura_vencimento - now()))
    ELSE 0
  END AS dias_restantes,
  a.created_at
FROM public.assinaturas_mecanico a
LEFT JOIN auth.users u ON a.user_id = u.id;
