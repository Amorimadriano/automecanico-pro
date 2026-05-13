-- Migration: f6_admin_role
-- Created at: 2026-05-13
-- Objetivo: Adiciona campo role para controle de admin e funcoes de gerenciamento

-- Adiciona coluna role na tabela de assinaturas
ALTER TABLE public.assinaturas_mecanico
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user'));

-- Atualiza view para incluir role
DROP VIEW IF EXISTS public.v_assinaturas_resumo_mecanico;
CREATE VIEW public.v_assinaturas_resumo_mecanico AS
SELECT
  a.id,
  a.user_id,
  u.email AS usuario_email,
  u.raw_user_meta_data->>'full_name' AS usuario_nome,
  a.status,
  a.role,
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
  a.created_at,
  a.updated_at
FROM public.assinaturas_mecanico a
LEFT JOIN auth.users u ON a.user_id = u.id;

-- Torna o usuario especificado administrador
UPDATE public.assinaturas_mecanico
SET role = 'admin'
WHERE user_id = 'b3b2547d-4c4b-4659-8703-04688d8f2640';

-- Funcao para verificar se usuario eh admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role INTO v_role
  FROM public.assinaturas_mecanico
  WHERE user_id = p_user_id;
  RETURN v_role = 'admin';
END;
$$;

-- Funcao para listar todos os usuarios com assinaturas (apenas admin)
CREATE OR REPLACE FUNCTION public.admin_listar_usuarios()
RETURNS TABLE(
  user_id UUID,
  email TEXT,
  nome TEXT,
  status TEXT,
  role TEXT,
  trial_fim TIMESTAMPTZ,
  assinatura_vencimento TIMESTAMPTZ,
  proxima_cobranca TIMESTAMPTZ,
  dias_restantes NUMERIC,
  created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  RETURN QUERY
  SELECT
    a.user_id,
    u.email::TEXT,
    (u.raw_user_meta_data->>'full_name')::TEXT AS nome,
    a.status,
    a.role,
    a.trial_fim,
    a.assinatura_vencimento,
    a.proxima_cobranca,
    CASE
      WHEN a.status = 'trial' THEN EXTRACT(DAY FROM (a.trial_fim - now()))
      WHEN a.status = 'ativo' THEN EXTRACT(DAY FROM (a.assinatura_vencimento - now()))
      ELSE 0
    END,
    a.created_at
  FROM public.assinaturas_mecanico a
  LEFT JOIN auth.users u ON a.user_id = u.id
  ORDER BY a.created_at DESC;
END;
$$;

-- Funcao para admin ativar assinatura manualmente
CREATE OR REPLACE FUNCTION public.admin_ativar_assinatura(p_target_user_id UUID, p_dias INTEGER DEFAULT 30)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  UPDATE public.assinaturas_mecanico
  SET
    status = 'ativo',
    assinatura_inicio = COALESCE(assinatura_inicio, now()),
    assinatura_vencimento = now() + (p_dias || ' days')::interval,
    proxima_cobranca = now() + (p_dias || ' days')::interval,
    ultimo_pagamento_id = COALESCE(ultimo_pagamento_id, 'admin_manual_' || now()::text)
  WHERE user_id = p_target_user_id;
END;
$$;

-- Funcao para admin bloquear assinatura
CREATE OR REPLACE FUNCTION public.admin_bloquear_assinatura(p_target_user_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  UPDATE public.assinaturas_mecanico
  SET
    status = 'vencido',
    assinatura_vencimento = now()
  WHERE user_id = p_target_user_id;
END;
$$;

-- Funcao para admin renovar trial
CREATE OR REPLACE FUNCTION public.admin_renovar_trial(p_target_user_id UUID, p_dias INTEGER DEFAULT 5)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;

  UPDATE public.assinaturas_mecanico
  SET
    status = 'trial',
    trial_fim = now() + (p_dias || ' days')::interval
  WHERE user_id = p_target_user_id;
END;
$$;

-- Garante que a view pode ser lida pelo admin
CREATE OR REPLACE FUNCTION public.admin_ver_assinaturas()
RETURNS SETOF public.v_assinaturas_resumo_mecanico LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.';
  END IF;
  RETURN QUERY SELECT * FROM public.v_assinaturas_resumo_mecanico;
END;
$$;
