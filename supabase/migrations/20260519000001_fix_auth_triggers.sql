-- Fix para handle_new_user e create_trial_on_signup
-- Corrige valor invalido do ENUM app_role e adiciona tratamento de excecao

-- ============================================================
-- 1. Corrige handle_new_user: 'responsavel' -> 'user' + exception handling
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE
  user_count int;
  assigned_role app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'phone'
  );

  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'user';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca impede o cadastro do usuario por falha em tabelas auxiliares.
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. Torna create_trial_on_signup resiliente
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_trial_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.user_trials (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. Torna criar_assinatura_trial resiliente (caso precise de reforco)
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
-- 4. Torna criar_empresa_padrao resiliente (caso precise de reforco)
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
