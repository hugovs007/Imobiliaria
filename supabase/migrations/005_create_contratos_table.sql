-- 2026-09-29 22:20:00

-- up
CREATE TABLE IF NOT EXISTS public.contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE RESTRICT,
  inquilino_id uuid NOT NULL REFERENCES public.inquilinos(id) ON DELETE RESTRICT,
  data_inicio date NOT NULL,
  data_fim date,
  dia_vencimento integer NOT NULL,
  valor_aluguel_atual numeric NOT NULL,
  indice_reajuste text NOT NULL,
  periodicidade_reajuste_meses integer NOT NULL DEFAULT 12,
  deposito_caucao numeric,
  clausulas_especiais text,
  status text NOT NULL DEFAULT 'ativo',
  contrato_anterior_id uuid REFERENCES public.contratos(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.contratos;