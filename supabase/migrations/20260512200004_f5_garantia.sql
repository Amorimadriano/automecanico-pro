-- Migration: F5 - Controle de Garantia
-- Criado em: 2026-05-12

-- Adiciona colunas de garantia nos itens da OS
ALTER TABLE public.os_itens_mecanico
  ADD COLUMN IF NOT EXISTS garantia_dias INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS garantia_data_vencimento DATE,
  ADD COLUMN IF NOT EXISTS tem_garantia BOOLEAN NOT NULL DEFAULT false;

-- Adiciona garantia padrão nas peças
ALTER TABLE public.pecas_mecanico
  ADD COLUMN IF NOT EXISTS garantia_padrao_dias INT DEFAULT 90;

-- View para garantias ativas
CREATE OR REPLACE VIEW public.v_garantias_ativas_mecanico AS
SELECT
  oi.id as item_id,
  oi.os_id,
  os.numero as os_numero,
  oi.descricao,
  oi.tipo,
  oi.garantia_dias,
  oi.garantia_data_vencimento,
  oi.tem_garantia,
  os.cliente_id,
  os.veiculo_id,
  os.user_id,
  os.data_entrada,
  os.data_conclusao
FROM public.os_itens_mecanico oi
JOIN public.ordens_servico_mecanico os ON os.id = oi.os_id
WHERE oi.tem_garantia = true;
