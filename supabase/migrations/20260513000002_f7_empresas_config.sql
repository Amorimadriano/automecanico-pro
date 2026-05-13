-- Migration: f7_empresas_config
-- Created at: 2026-05-13
-- Objetivo: Tabela de configuracoes/dados da empresa (oficina)

CREATE TABLE IF NOT EXISTS public.empresas_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  endereco TEXT,
  telefone TEXT,
  chave_pix TEXT,
  alerta_estoque_baixo BOOLEAN NOT NULL DEFAULT true,
  cupom_fiscal_automatico BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own empresas_mecanico" ON public.empresas_mecanico
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS tg_empresas_mecanico_upd ON public.empresas_mecanico;
CREATE TRIGGER tg_empresas_mecanico_upd
  BEFORE UPDATE ON public.empresas_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Funcao para criar empresa padrao ao criar trial
CREATE OR REPLACE FUNCTION public.criar_empresa_padrao()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.empresas_mecanico (user_id, nome_fantasia)
  VALUES (NEW.user_id, 'Minha Oficina');
  RETURN NEW;
END;
$$;

-- Trigger para criar empresa padrao quando criar assinatura trial
DROP TRIGGER IF EXISTS tg_criar_empresa_padrao ON public.assinaturas_mecanico;
CREATE TRIGGER tg_criar_empresa_padrao
  AFTER INSERT ON public.assinaturas_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.criar_empresa_padrao();

-- Criar empresa para usuarios existentes que nao tem
INSERT INTO public.empresas_mecanico (user_id, nome_fantasia)
SELECT a.user_id, 'Minha Oficina'
FROM public.assinaturas_mecanico a
LEFT JOIN public.empresas_mecanico e ON e.user_id = a.user_id
WHERE e.id IS NULL
ON CONFLICT DO NOTHING;
