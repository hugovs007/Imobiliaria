-- 2026-09-29 22:50:00

-- up
CREATE TABLE IF NOT EXISTS public.contas_consumo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE RESTRICT,
  tipo text NOT NULL,
  competencia date NOT NULL,
  valor numeric NOT NULL,
  vencimento date NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  responsavel_pagamento text NOT NULL DEFAULT 'inquilino',
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.contas_consumo;