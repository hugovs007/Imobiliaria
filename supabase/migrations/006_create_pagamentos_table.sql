-- 2026-09-29 22:25:00

-- up
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL REFERENCES public.contratos(id) ON DELETE RESTRICT,
  competencia date NOT NULL,
  valor_devido numeric NOT NULL,
  data_vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  valor_pago numeric DEFAULT 0,
  data_pagamento date,
  forma_pagamento text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (contrato_id, competencia)
);

-- down
DROP TABLE IF EXISTS public.pagamentos;