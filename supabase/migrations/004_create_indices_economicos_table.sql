-- 2026-09-29 22:15:00

-- up
CREATE TABLE IF NOT EXISTS public.indices_economicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indice text NOT NULL,
  competencia date NOT NULL,
  valor_percentual numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (indice, competencia)
);

-- down
DROP TABLE IF EXISTS public.indices_economicos;