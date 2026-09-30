-- 2026-09-29 22:35:00

-- up
CREATE TABLE IF NOT EXISTS public.reajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE RESTRICT,
  data_referencia date NOT NULL,
  indice_usado text NOT NULL,
  percentual_aplicado numeric NOT NULL,
  valor_anterior numeric NOT NULL,
  valor_novo numeric NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.reajustes;