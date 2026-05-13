-- Migration: f7_empresas_config_fix
-- Created at: 2026-05-13
-- Objetivo: Adiciona UNIQUE em user_id para upsert funcionar corretamente

-- Remove duplicados (mantem o mais recente)
DELETE FROM public.empresas_mecanico a
USING public.empresas_mecanico b
WHERE a.id < b.id
  AND a.user_id = b.user_id;

-- Adiciona constraint UNIQUE em user_id
ALTER TABLE public.empresas_mecanico
ADD CONSTRAINT empresas_mecanico_user_id_unique UNIQUE (user_id);
