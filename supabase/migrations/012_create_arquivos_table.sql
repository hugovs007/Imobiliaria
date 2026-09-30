-- 2026-09-29 22:55:00

-- up
CREATE TABLE IF NOT EXISTS public.arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade_tipo text NOT NULL,
  entidade_id uuid NOT NULL,
  nome text NOT NULL,
  tipo_arquivo text,
  storage_provider text NOT NULL DEFAULT 'supabase',
  path_ou_url text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.arquivos;