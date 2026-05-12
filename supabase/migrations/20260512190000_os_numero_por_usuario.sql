-- Migration: os_numero_por_usuario
-- Created at: 2026-05-12 19:00:00
-- Objetivo: Substituir SERIAL global de ordens_servico_mecanico.numero
-- por um sequencial por usuário (user_id).

-- 1. Remove o DEFAULT da coluna numero (desvincula do SERIAL/sequência global)
ALTER TABLE public.ordens_servico_mecanico
  ALTER COLUMN numero DROP DEFAULT;

-- 2. Remove a sequência criada automaticamente pelo SERIAL, se existir
DROP SEQUENCE IF EXISTS public.ordens_servico_mecanico_numero_seq;

-- 3. Função para atribuir o próximo número sequencial por usuário
CREATE OR REPLACE FUNCTION public.set_os_numero()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    SELECT COALESCE(MAX(numero), 0) + 1
    INTO NEW.numero
    FROM public.ordens_servico_mecanico
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Trigger que executa a função antes de cada INSERT
DROP TRIGGER IF EXISTS tg_ordens_servico_mecanico_numero
  ON public.ordens_servico_mecanico;

CREATE TRIGGER tg_ordens_servico_mecanico_numero
  BEFORE INSERT ON public.ordens_servico_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_os_numero();
