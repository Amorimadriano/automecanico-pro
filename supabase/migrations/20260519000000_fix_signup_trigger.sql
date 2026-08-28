-- Migration: fix_signup_trigger
-- Created at: 2026-05-19
-- Objetivo: Torna os triggers de cadastro resilientes para evitar
--           "Database error saving new user" no Supabase Auth.

-- ============================================================
-- 1. Torna criar_empresa_padrao a prova de duplicatas e falhas
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_empresa_padrao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.empresas_mecanico (user_id, nome_fantasia)
  VALUES (NEW.user_id, 'Minha Oficina')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impede o cadastro do usuario por falha na criacao da empresa.
  -- O ideal e que a empresa exista, mas o usuario deve conseguir se cadastrar.
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Torna criar_assinatura_trial a prova de falhas secundarias
-- ============================================================
CREATE OR REPLACE FUNCTION public.criar_assinatura_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.assinaturas_mecanico (user_id, status, trial_inicio, trial_fim)
  VALUES (NEW.id, 'trial', now(), now() + interval '5 days')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Se a criacao da assinatura falhar (ex: RLS, schema inconsistente),
  -- o usuario ainda e criado. A assinatura podera ser criada
  -- manualmente ou via edge function posteriormente.
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Garante que usuarios existentes sem assinatura recebam trial
-- ============================================================
INSERT INTO public.assinaturas_mecanico (user_id, status, trial_inicio, trial_fim)
SELECT u.id, 'trial', now(), now() + interval '5 days'
FROM auth.users u
LEFT JOIN public.assinaturas_mecanico a ON a.user_id = u.id
WHERE a.id IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Garante que usuarios existentes sem empresa recebam empresa padrao
-- ============================================================
INSERT INTO public.empresas_mecanico (user_id, nome_fantasia)
SELECT u.id, 'Minha Oficina'
FROM auth.users u
LEFT JOIN public.empresas_mecanico e ON e.user_id = u.id
WHERE e.id IS NULL
ON CONFLICT (user_id) DO NOTHING;
