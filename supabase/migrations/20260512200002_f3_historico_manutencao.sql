-- Migration: F3 - Historico de Manutencao por Veiculo + Alertas de Revisao
-- Created at: 2026-05-12 20:00:02

-- ============================================================
-- 1. View: v_historico_veiculo_mecanico
--    Junta veiculos + ordens_servico + os_itens agregados
-- ============================================================
CREATE OR REPLACE VIEW public.v_historico_veiculo_mecanico
WITH (security_invoker = true)
AS
SELECT
  v.id AS veiculo_id,
  v.placa,
  v.marca,
  v.modelo,
  v.ano,
  v.cor,
  v.km_atual,
  v.km_proxima_revisao,
  v.data_proxima_revisao,
  v.cliente_id,
  c.nome AS cliente_nome,
  os.id AS os_id,
  os.numero,
  os.data_entrada,
  os.km_entrada,
  os.status,
  os.total,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', oi.id,
        'tipo', oi.tipo,
        'descricao', oi.descricao,
        'quantidade', oi.quantidade,
        'preco_unitario', oi.preco_unitario,
        'subtotal', oi.subtotal
      ) ORDER BY oi.tipo, oi.descricao
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::jsonb
  ) AS itens
FROM public.veiculos_mecanico v
LEFT JOIN public.clientes_mecanico c ON c.id = v.cliente_id
LEFT JOIN public.ordens_servico_mecanico os ON os.veiculo_id = v.id
LEFT JOIN public.os_itens_mecanico oi ON oi.os_id = os.id
GROUP BY
  v.id, v.placa, v.marca, v.modelo, v.ano, v.cor,
  v.km_atual, v.km_proxima_revisao, v.data_proxima_revisao,
  v.cliente_id, c.nome,
  os.id, os.numero, os.data_entrada, os.km_entrada, os.status, os.total;

-- ============================================================
-- 2. Function RPC: veiculos_revisao_proxima()
--    Retorna veiculos com revisao proxima (7 dias ou 500 km)
-- ============================================================
CREATE OR REPLACE FUNCTION public.veiculos_revisao_proxima()
RETURNS TABLE (
  id UUID,
  placa TEXT,
  marca TEXT,
  modelo TEXT,
  ano INT,
  cor TEXT,
  km_atual INT,
  km_proxima_revisao INT,
  data_proxima_revisao DATE,
  cliente_nome TEXT,
  alerta TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id,
    v.placa,
    v.marca,
    v.modelo,
    v.ano,
    v.cor,
    v.km_atual,
    v.km_proxima_revisao,
    v.data_proxima_revisao,
    c.nome AS cliente_nome,
    CASE
      WHEN v.data_proxima_revisao IS NOT NULL AND v.data_proxima_revisao <= (CURRENT_DATE + INTERVAL '7 days')
        THEN 'revisao_data'
      WHEN v.km_proxima_revisao IS NOT NULL AND v.km_atual IS NOT NULL AND v.km_atual >= (v.km_proxima_revisao - 500)
        THEN 'revisao_km'
      ELSE NULL
    END::TEXT AS alerta
  FROM public.veiculos_mecanico v
  LEFT JOIN public.clientes_mecanico c ON c.id = v.cliente_id
  WHERE v.user_id = auth.uid()
    AND (
      (v.data_proxima_revisao IS NOT NULL AND v.data_proxima_revisao <= (CURRENT_DATE + INTERVAL '7 days'))
      OR
      (v.km_proxima_revisao IS NOT NULL AND v.km_atual IS NOT NULL AND v.km_atual >= (v.km_proxima_revisao - 500))
    )
  ORDER BY v.data_proxima_revisao ASC NULLS LAST, v.km_proxima_revisao ASC NULLS LAST;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.veiculos_revisao_proxima() TO authenticated;

-- ============================================================
-- 3. Function RPC: historico_veiculo(p_veiculo_id UUID)
--    Retorna historico de OS de um veiculo especifico
-- ============================================================
CREATE OR REPLACE FUNCTION public.historico_veiculo(p_veiculo_id UUID)
RETURNS TABLE (
  veiculo_id UUID,
  placa TEXT,
  os_id UUID,
  numero INT,
  data_entrada TIMESTAMPTZ,
  km_entrada INT,
  status TEXT,
  itens JSONB,
  total NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    v.id AS veiculo_id,
    v.placa,
    os.id AS os_id,
    os.numero,
    os.data_entrada,
    os.km_entrada,
    os.status,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'tipo', oi.tipo,
          'descricao', oi.descricao,
          'quantidade', oi.quantidade,
          'preco_unitario', oi.preco_unitario,
          'subtotal', oi.subtotal
        ) ORDER BY oi.tipo, oi.descricao
      ) FILTER (WHERE oi.id IS NOT NULL),
      '[]'::jsonb
    ) AS itens,
    os.total
  FROM public.veiculos_mecanico v
  INNER JOIN public.ordens_servico_mecanico os ON os.veiculo_id = v.id
  LEFT JOIN public.os_itens_mecanico oi ON oi.os_id = os.id
  WHERE v.id = p_veiculo_id
    AND v.user_id = auth.uid()
  GROUP BY v.id, v.placa, os.id, os.numero, os.data_entrada, os.km_entrada, os.status, os.total
  ORDER BY os.data_entrada DESC;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.historico_veiculo(UUID) TO authenticated;
