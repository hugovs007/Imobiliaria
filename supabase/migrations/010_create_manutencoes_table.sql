-- 2026-09-29 22:45:00

-- up
CREATE TABLE IF NOT EXISTS public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imovel_id uuid NOT NULL REFERENCES public.imoveis(id) ON DELETE RESTRICT,
  tipo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'aberta',
  custo numeric,
  responsavel text,
  data_solicitacao date NOT NULL,
  data_conclusao date,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.manutencoes;