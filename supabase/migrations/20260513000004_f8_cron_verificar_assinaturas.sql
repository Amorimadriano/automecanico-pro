-- Migration: f8_cron_verificar_assinaturas
-- Created at: 2026-05-13
-- Objetivo: Configurar job cron para verificar assinaturas vencidas automaticamente

-- Garante que a funcao de verificar assinaturas existe e esta atualizada
CREATE OR REPLACE FUNCTION public.verificar_assinaturas_vencidas()
RETURNS TABLE(user_id UUID, email TEXT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  UPDATE public.assinaturas_mecanico a
  SET status = 'vencido',
      updated_at = now()
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

-- Garante que a funcao de enviar notificacao de vencimento proximo existe
CREATE OR REPLACE FUNCTION public.notificar_assinaturas_proximo_vencimento()
RETURNS TABLE(user_id UUID, email TEXT, dias_restantes INT) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.user_id,
    u.email,
    CASE
      WHEN a.status = 'ativo' THEN EXTRACT(DAY FROM (a.assinatura_vencimento - now()))::INT
      WHEN a.status = 'trial' THEN EXTRACT(DAY FROM (a.trial_fim - now()))::INT
      ELSE 0
    END as dias_restantes
  FROM public.assinaturas_mecanico a
  JOIN auth.users u ON a.user_id = u.id
  WHERE a.status IN ('ativo', 'trial')
    AND (
      (a.status = 'ativo' AND a.assinatura_vencimento BETWEEN now() AND now() + interval '3 days')
      OR (a.status = 'trial' AND a.trial_fim BETWEEN now() AND now() + interval '3 days')
    );
END;
$$;

-- Tenta criar o cron job se a extensao pg_cron estiver disponivel
DO $$
BEGIN
  -- Verifica se pg_cron esta instalado
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove job existente se houver
    PERFORM cron.unschedule('verificar-assinaturas-diario');

    -- Cria novo job para rodar todo dia as 3h da manha (horario de menor uso)
    PERFORM cron.schedule(
      'verificar-assinaturas-diario',
      '0 3 * * *',
      'SELECT * FROM public.verificar_assinaturas_vencidas();'
    );

    RAISE NOTICE 'Cron job verificar-assinaturas-diario criado com sucesso';
  ELSE
    RAISE NOTICE 'Extensao pg_cron nao disponivel. O job deve ser executado via Edge Function ou scheduler externo.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Erro ao configurar cron job: %', SQLERRM;
END $$;
