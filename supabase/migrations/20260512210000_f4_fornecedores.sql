
-- Fornecedores
CREATE TABLE public.fornecedores_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  email TEXT,
  website TEXT,
  api_endpoint TEXT,
  api_key TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedores_mecanico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fornecedores_mecanico" ON public.fornecedores_mecanico FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Catálogo cache local do fornecedor
CREATE TABLE public.fornecedor_catalogo_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  fornecedor_id UUID NOT NULL REFERENCES public.fornecedores_mecanico(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2),
  marca TEXT,
  categoria TEXT,
  ultima_atualizacao TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fornecedor_catalogo_mecanico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own fornecedor_catalogo_mecanico" ON public.fornecedor_catalogo_mecanico FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Índice de busca full-text
CREATE INDEX idx_catalogo_busca ON public.fornecedor_catalogo_mecanico USING gin(to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, '')));

-- Trigger updated_at
CREATE TRIGGER tg_fornecedores_mecanico_upd BEFORE UPDATE ON public.fornecedores_mecanico FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
