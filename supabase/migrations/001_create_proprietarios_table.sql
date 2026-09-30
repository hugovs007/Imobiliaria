-- 2026-09-29 22:00:00

-- up
CREATE TABLE IF NOT EXISTS public.proprietarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  email text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.proprietarios;