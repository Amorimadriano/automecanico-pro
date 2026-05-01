
-- Clientes
CREATE TABLE public.clientes (
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
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own clientes" ON public.clientes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Veículos
CREATE TABLE public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
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
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own veiculos" ON public.veiculos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Funcionários (mecânicos)
CREATE TABLE public.funcionarios (
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
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own funcionarios" ON public.funcionarios FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Peças / Estoque
CREATE TABLE public.pecas (
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
ALTER TABLE public.pecas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pecas" ON public.pecas FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Ordens de Serviço
CREATE TABLE public.ordens_servico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  numero SERIAL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'aberta', -- aberta | em_andamento | aguardando_pecas | concluida | cancelada
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
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own os" ON public.ordens_servico FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Itens da OS (peças e serviços)
CREATE TABLE public.os_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  os_id UUID NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL, -- 'peca' | 'servico'
  peca_id UUID REFERENCES public.pecas(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC(12,2) NOT NULL DEFAULT 1,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.os_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own os_itens" ON public.os_itens FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Agendamentos
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  duracao_min INT DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'agendado', -- agendado | concluido | cancelado
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agendamentos" ON public.agendamentos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Financeiro
CREATE TABLE public.financeiro (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL, -- 'receita' | 'despesa'
  categoria TEXT,
  descricao TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  pago BOOLEAN NOT NULL DEFAULT false,
  os_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financeiro ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own financeiro" ON public.financeiro FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER tg_clientes_upd BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_veiculos_upd BEFORE UPDATE ON public.veiculos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_pecas_upd BEFORE UPDATE ON public.pecas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER tg_os_upd BEFORE UPDATE ON public.ordens_servico FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_veiculos_cliente ON public.veiculos(cliente_id);
CREATE INDEX idx_os_user_status ON public.ordens_servico(user_id, status);
CREATE INDEX idx_os_itens_os ON public.os_itens(os_id);
CREATE INDEX idx_fin_user_data ON public.financeiro(user_id, data_vencimento);
CREATE INDEX idx_agend_user_data ON public.agendamentos(user_id, data_hora);
