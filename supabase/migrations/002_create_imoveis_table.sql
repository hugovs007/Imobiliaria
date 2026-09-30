-- 2026-09-29 22:05:00

-- up
CREATE TABLE IF NOT EXISTS public.imoveis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proprietario_id uuid NULL REFERENCES public.proprietarios(id) ON DELETE SET NULL,
  codigo text,
  tipo text NOT NULL,
  finalidade text,
  status text NOT NULL DEFAULT 'disponivel',
  endereco text NOT NULL,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  quartos integer,
  banheiros integer,
  garagem integer,
  area_util numeric,
  valor_venda numeric,
  valor_aluguel numeric,
  valor_iptu numeric,
  propriedade text,
  observacoes text,
  criado_em timestamp with time zone NOT NULL DEFAULT timezone('utc', now())
);

-- down
DROP TABLE IF EXISTS public.imoveis;