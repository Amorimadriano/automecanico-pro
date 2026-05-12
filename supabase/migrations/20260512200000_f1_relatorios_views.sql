-- Migration: f1_relatorios_views
-- Objetivo: Views e funções RPC para relatórios e dashboards avançados

-- ============================================================
-- 1. Função RPC: dashboard_funcionario_mecanico
-- Retorna OS atribuídas, concluídas e comissões por funcionário
-- ============================================================
CREATE OR REPLACE FUNCTION public.dashboard_funcionario_mecanico(p_user_id UUID, p_funcionario_id UUID)
RETURNS TABLE (
  metric TEXT,
  valor NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_os_mes INT;
  v_os_concluidas INT;
  v_comissao_acumulada NUMERIC;
BEGIN
  -- OS atribuídas no mês atual
  SELECT COUNT(*) INTO v_os_mes
  FROM public.ordens_servico_mecanico
  WHERE user_id = p_user_id
    AND funcionario_id = p_funcionario_id
    AND EXTRACT(MONTH FROM data_entrada) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM data_entrada) = EXTRACT(YEAR FROM CURRENT_DATE);

  -- OS concluídas
  SELECT COUNT(*) INTO v_os_concluidas
  FROM public.ordens_servico_mecanico
  WHERE user_id = p_user_id
    AND funcionario_id = p_funcionario_id
    AND status = 'concluida';

  -- Comissão acumulada (pendente + paga)
  SELECT COALESCE(SUM(valor_comissao), 0) INTO v_comissao_acumulada
  FROM public.comissoes_mecanico
  WHERE user_id = p_user_id
    AND funcionario_id = p_funcionario_id;

  RETURN QUERY
  SELECT 'os_mes'::TEXT, v_os_mes::NUMERIC
  UNION ALL
  SELECT 'os_concluidas'::TEXT, v_os_concluidas::NUMERIC
  UNION ALL
  SELECT 'comissao_acumulada'::TEXT, v_comissao_acumulada;
END;
$$;

-- ============================================================
-- 2. Função RPC: dashboard_funcionario_os_por_mes
-- Retorna OS por funcionário agrupadas por mês (últimos N meses)
-- ============================================================
CREATE OR REPLACE FUNCTION public.dashboard_funcionario_os_por_mes(p_user_id UUID, p_funcionario_id UUID, p_meses INT DEFAULT 6)
RETURNS TABLE (
  mes TEXT,
  ano INT,
  total_os INT,
  concluidas INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    TO_CHAR(DATE_TRUNC('month', os.data_entrada), 'Mon')::TEXT AS mes,
    EXTRACT(YEAR FROM os.data_entrada)::INT AS ano,
    COUNT(*)::INT AS total_os,
    COUNT(*) FILTER (WHERE os.status = 'concluida')::INT AS concluidas
  FROM public.ordens_servico_mecanico os
  WHERE os.user_id = p_user_id
    AND os.funcionario_id = p_funcionario_id
    AND os.data_entrada >= DATE_TRUNC('month', CURRENT_DATE - (p_meses || ' months')::INTERVAL)
  GROUP BY DATE_TRUNC('month', os.data_entrada)
  ORDER BY DATE_TRUNC('month', os.data_entrada);
END;
$$;

-- ============================================================
-- 3. Função RPC: relatorio_financeiro_mensal
-- Retorna receitas/despesas/saldo por mês/ano
-- ============================================================
CREATE OR REPLACE FUNCTION public.relatorio_financeiro_mensal(p_user_id UUID, p_ano INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT)
RETURNS TABLE (
  mes INT,
  nome_mes TEXT,
  total_receitas NUMERIC,
  total_despesas NUMERIC,
  saldo NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH meses AS (
    SELECT generate_series(1, 12) AS mes
  ),
  agregado AS (
    SELECT
      EXTRACT(MONTH FROM f.data_vencimento)::INT AS mes,
      SUM(f.valor) FILTER (WHERE f.tipo = 'receita' AND f.pago = true) AS receitas,
      SUM(f.valor) FILTER (WHERE f.tipo = 'despesa' AND f.pago = true) AS despesas
    FROM public.financeiro_mecanico f
    WHERE f.user_id = p_user_id
      AND EXTRACT(YEAR FROM f.data_vencimento) = p_ano
    GROUP BY EXTRACT(MONTH FROM f.data_vencimento)
  )
  SELECT
    m.mes,
    TO_CHAR(TO_DATE(m.mes::TEXT, 'MM'), 'Mon')::TEXT AS nome_mes,
    COALESCE(a.receitas, 0)::NUMERIC AS total_receitas,
    COALESCE(a.despesas, 0)::NUMERIC AS total_despesas,
    (COALESCE(a.receitas, 0) - COALESCE(a.despesas, 0))::NUMERIC AS saldo
  FROM meses m
  LEFT JOIN agregado a ON a.mes = m.mes
  ORDER BY m.mes;
END;
$$;

-- ============================================================
-- 4. Função RPC: relatorio_financeiro_categorias
-- Retorna detalhamento por categoria no período
-- ============================================================
CREATE OR REPLACE FUNCTION public.relatorio_financeiro_categorias(p_user_id UUID, p_ano INT DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INT, p_mes INT DEFAULT NULL)
RETURNS TABLE (
  tipo TEXT,
  categoria TEXT,
  total NUMERIC,
  quantidade INT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.tipo,
    COALESCE(f.categoria, 'Sem categoria')::TEXT AS categoria,
    SUM(f.valor)::NUMERIC AS total,
    COUNT(*)::INT AS quantidade
  FROM public.financeiro_mecanico f
  WHERE f.user_id = p_user_id
    AND EXTRACT(YEAR FROM f.data_vencimento) = p_ano
    AND (p_mes IS NULL OR EXTRACT(MONTH FROM f.data_vencimento) = p_mes)
    AND f.pago = true
  GROUP BY f.tipo, COALESCE(f.categoria, 'Sem categoria')
  ORDER BY total DESC;
END;
$$;

-- ============================================================
-- 5. Função RPC: relatorio_estoque_abc
-- Curva ABC por valor de venda (quantidade * preco_venda)
-- ============================================================
CREATE OR REPLACE FUNCTION public.relatorio_estoque_abc(p_user_id UUID)
RETURNS TABLE (
  peca_id UUID,
  codigo TEXT,
  nome TEXT,
  quantidade INT,
  preco_venda NUMERIC,
  valor_total NUMERIC,
  percentual NUMERIC,
  percentual_acumulado NUMERIC,
  classe TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  WITH ranked AS (
    SELECT
      p.id AS peca_id,
      p.codigo,
      p.nome,
      p.quantidade::INT,
      p.preco_venda,
      (p.quantidade * p.preco_venda)::NUMERIC AS valor_total,
      (p.quantidade * p.preco_venda) / NULLIF(SUM(p.quantidade * p.preco_venda) OVER (), 0) * 100 AS percentual
    FROM public.pecas_mecanico p
    WHERE p.user_id = p_user_id
  ),
  acumulado AS (
    SELECT
      r.*,
      SUM(r.percentual) OVER (ORDER BY r.valor_total DESC) AS percentual_acumulado
    FROM ranked r
  )
  SELECT
    a.peca_id,
    a.codigo,
    a.nome,
    a.quantidade,
    a.preco_venda,
    a.valor_total,
    a.percentual,
    a.percentual_acumulado,
    CASE
      WHEN a.percentual_acumulado <= 80 THEN 'A'
      WHEN a.percentual_acumulado <= 95 THEN 'B'
      ELSE 'C'
    END::TEXT AS classe
  FROM acumulado a
  ORDER BY a.valor_total DESC;
END;
$$;

-- ============================================================
-- 6. Função RPC: relatorio_clientes
-- Ticket médio, frequência e última visita
-- ============================================================
CREATE OR REPLACE FUNCTION public.relatorio_clientes(p_user_id UUID)
RETURNS TABLE (
  cliente_id UUID,
  nome TEXT,
  total_os INT,
  ticket_medio NUMERIC,
  total_gasto NUMERIC,
  ultima_visita TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS cliente_id,
    c.nome,
    COUNT(os.id)::INT AS total_os,
    COALESCE(AVG(os.total), 0)::NUMERIC AS ticket_medio,
    COALESCE(SUM(os.total), 0)::NUMERIC AS total_gasto,
    MAX(os.data_entrada)::TEXT AS ultima_visita
  FROM public.clientes_mecanico c
  LEFT JOIN public.ordens_servico_mecanico os
    ON os.cliente_id = c.id
    AND os.user_id = p_user_id
  WHERE c.user_id = p_user_id
  GROUP BY c.id, c.nome
  ORDER BY ticket_medio DESC;
END;
$$;

-- ============================================================
-- 7. Índices auxiliares para performance dos relatórios
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_os_mecanico_func_data
  ON public.ordens_servico_mecanico(funcionario_id, data_entrada);

CREATE INDEX IF NOT EXISTS idx_fin_mecanico_tipo_cat
  ON public.financeiro_mecanico(user_id, tipo, categoria, data_vencimento);
