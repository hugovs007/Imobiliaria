-- 2026-09-27 20:50:00

-- Create enum type for payment status if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_pagamento') THEN
    CREATE TYPE public.status_pagamento AS ENUM ('pendente', 'pago', 'atrasado', 'isento');
  END IF;
END $$;

-- Create enum type for storage provider if it does not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'storage_provider') THEN
    CREATE TYPE public.storage_provider AS ENUM ('supabase', 'google', 'aws');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  contrato_id uuid NOT NULL,
  competencia date NOT NULL,
  valor_devido numeric(12, 2) NOT NULL,
  valor_pago numeric(12, 2),
  data_vencimento date NOT NULL,
  data_pagamento date,
  status public.status_pagamento NOT NULL DEFAULT 'pendente'::public.status_pagamento,
  forma_pagamento text,
  recibo_path text,
  recibo_provider public.storage_provider DEFAULT 'supabase'::public.storage_provider,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT pagamentos_pkey PRIMARY KEY (id),
  CONSTRAINT pagamentos_contrato_id_competencia_key UNIQUE (contrato_id, competencia),
  CONSTRAINT pagamentos_contrato_id_fkey FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
  CONSTRAINT pagamentos_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato ON public.pagamentos USING btree (contrato_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos USING btree (status);
