-- Migration: fix_auth_triggers
-- Created at: 2026-05-19
-- Objetivo: Torna os triggers de assinaturas e empresa resilientes a falhas secundarias

-- ============================================================
-- 1. Torna criar_assinatura_trial resiliente
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_assinatura_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.assinaturas_mecanico (user_id, status, trial_inicio, trial_fim)
  VALUES (NEW.id, 'trial', now(), now() + interval '5 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Torna criar_empresa_padrao resiliente
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_empresa_padrao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.empresas_mecanico (user_id, nome_fantasia)
  VALUES (NEW.user_id, 'Minha Oficina')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
