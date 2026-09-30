-- 2026-09-29 23:00:00

-- up
-- A tabela profiles é criada automaticamente pelo Supabase Auth
-- Esta migração adiciona as colunas personalizadas
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nome text,
ADD COLUMN IF NOT EXISTS papel text DEFAULT 'corretor',
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT false;

-- down
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS nome,
DROP COLUMN IF EXISTS papel,
DROP COLUMN IF EXISTS ativo;