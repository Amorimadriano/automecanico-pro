-- Migration: create_tables_mecanico
-- Created at: 2026-05-12 17:00:00
-- Objetivo: Criar tabelas paralelas com sufixo _mecanico sem alterar as existentes.

-- ============================================================
-- 1. clientes_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clientes_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  documento TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clientes_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own clientes_mecanico" ON public.clientes_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 2. veiculos_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.veiculos_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes_mecanico(id) ON DELETE CASCADE,
  placa TEXT NOT NULL,
  marca TEXT,
  modelo TEXT,
  ano INT,
  cor TEXT,
  km_atual INT DEFAULT 0,
  km_proxima_revisao INT,
  data_proxima_revisao DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.veiculos_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own veiculos_mecanico" ON public.veiculos_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. funcionarios_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.funcionarios_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  telefone TEXT,
  email TEXT,
  comissao_percent NUMERIC(5,2) DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.funcionarios_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own funcionarios_mecanico" ON public.funcionarios_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 4. pecas_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pecas_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  codigo TEXT,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_custo NUMERIC(12,2) DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  quantidade INT NOT NULL DEFAULT 0,
  estoque_minimo INT NOT NULL DEFAULT 1,
  unidade TEXT DEFAULT 'un',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.pecas_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own pecas_mecanico" ON public.pecas_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. ordens_servico_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ordens_servico_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero SERIAL,
  cliente_id UUID NOT NULL REFERENCES public.clientes_mecanico(id) ON DELETE RESTRICT,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos_mecanico(id) ON DELETE RESTRICT,
  funcionario_id UUID REFERENCES public.funcionarios_mecanico(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberta',
  descricao_problema TEXT,
  diagnostico TEXT,
  km_entrada INT,
  data_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_prevista TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_pecas NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_servicos NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  pago BOOLEAN NOT NULL DEFAULT false,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ordens_servico_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own os_mecanico" ON public.ordens_servico_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. os_itens_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.os_itens_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  os_id UUID NOT NULL REFERENCES public.ordens_servico_mecanico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  peca_id UUID REFERENCES public.pecas_mecanico(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.os_itens_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own os_itens_mecanico" ON public.os_itens_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. agendamentos_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agendamentos_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes_mecanico(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos_mecanico(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES public.funcionarios_mecanico(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_min INT DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'agendado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agendamentos_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own agendamentos_mecanico" ON public.agendamentos_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. financeiro_mecanico
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financeiro_mecanico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  pago BOOLEAN NOT NULL DEFAULT false,
  os_id UUID REFERENCES public.ordens_servico_mecanico(id) ON DELETE SET NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_mecanico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own financeiro_mecanico" ON public.financeiro_mecanico
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 9. updated_at trigger function e triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tg_clientes_mecanico_upd
  BEFORE UPDATE ON public.clientes_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_veiculos_mecanico_upd
  BEFORE UPDATE ON public.veiculos_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_pecas_mecanico_upd
  BEFORE UPDATE ON public.pecas_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER tg_os_mecanico_upd
  BEFORE UPDATE ON public.ordens_servico_mecanico
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 10. Indices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_veiculos_mecanico_cliente
  ON public.veiculos_mecanico(cliente_id);

CREATE INDEX IF NOT EXISTS idx_os_mecanico_user_status
  ON public.ordens_servico_mecanico(user_id, status);

CREATE INDEX IF NOT EXISTS idx_os_itens_mecanico_os
  ON public.os_itens_mecanico(os_id);

CREATE INDEX IF NOT EXISTS idx_fin_mecanico_user_data
  ON public.financeiro_mecanico(user_id, data_vencimento);

CREATE INDEX IF NOT EXISTS idx_agend_mecanico_user_data
  ON public.agendamentos_mecanico(user_id, data_hora);
