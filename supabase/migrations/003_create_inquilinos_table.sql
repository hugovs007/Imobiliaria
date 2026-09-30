-- 2026-09-29 22:10:00

-- up
CREATE TABLE IF NOT EXISTS public.inquilinos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cpf_cnpj text,
  telefone text,
  email text,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.inquilinos;