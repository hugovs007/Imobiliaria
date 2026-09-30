-- 2026-09-29 22:40:00

-- up
-- Função para gerar reajustes pendentes
CREATE OR REPLACE FUNCTION public.gerar_reajustes_pendentes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contrato_record RECORD;
  indice_record RECORD;
  percentual numeric;
  novo_valor numeric;
BEGIN
  -- Busca contratos ativos/renovados que precisam de reajuste
  FOR contrato_record IN
    SELECT c.id, c.valor_aluguel_atual, c.indice_reajuste, c.periodicidade_reajuste_meses, c.data_inicio
    FROM public.contratos c
    WHERE c.status IN ('ativo', 'renovado')
    AND NOT EXISTS (
      SELECT 1 FROM public.contratos c2 WHERE c2.contrato_anterior_id = c.id
    )
  LOOP
    -- Verifica se já existe reajuste pendente para este contrato
    IF NOT EXISTS (
      SELECT 1 FROM public.reajustes r
      WHERE r.contrato_id = contrato_record.id
      AND r.status = 'pendente'
    ) THEN
      -- Busca o índice econômico mais recente
      SELECT valor_percentual INTO percentual
      FROM public.indices_economicos
      WHERE indice = contrato_record.indice_reajuste
      ORDER BY competencia DESC
      LIMIT 1;

      IF percentual IS NOT NULL THEN
        novo_valor := contrato_record.valor_aluguel_atual * (1 + percentual / 100);
        
        INSERT INTO public.reajustes (
          contrato_id,
          data_referencia,
          indice_usado,
          percentual_aplicado,
          valor_anterior,
          valor_novo,
          status
        ) VALUES (
          contrato_record.id,
          CURRENT_DATE,
          contrato_record.indice_reajuste,
          percentual,
          contrato_record.valor_aluguel_atual,
          novo_valor,
          'pendente'
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Função para aplicar reajuste
CREATE OR REPLACE FUNCTION public.aplicar_reajuste(p_reajuste_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reajuste_record RECORD;
BEGIN
  SELECT * INTO reajuste_record
  FROM public.reajustes
  WHERE id = p_reajuste_id
  AND status = 'pendente';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reajuste não encontrado ou já aplicado';
  END IF;

  -- Atualiza o valor do aluguel no contrato
  UPDATE public.contratos
  SET valor_aluguel_atual = reajuste_record.valor_novo
  WHERE id = reajuste_record.contrato_id;

  -- Marca o reajuste como aplicado
  UPDATE public.reajustes
  SET status = 'aplicado'
  WHERE id = p_reajuste_id;
END;
$$;

-- Função para renovar contrato
CREATE OR REPLACE FUNCTION public.renovar_contrato(p_contrato_id uuid, p_data_inicio date, p_data_fim date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contrato_antigo RECORD;
  novo_contrato_id uuid;
BEGIN
  -- Busca o contrato antigo
  SELECT * INTO contrato_antigo
  FROM public.contratos
  WHERE id = p_contrato_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contrato não encontrado';
  END IF;

  -- Cria novo contrato renovado
  INSERT INTO public.contratos (
    imovel_id,
    inquilino_id,
    data_inicio,
    data_fim,
    dia_vencimento,
    valor_aluguel_atual,
    indice_reajuste,
    periodicidade_reajuste_meses,
    deposito_caucao,
    clausulas_especiais,
    status,
    contrato_anterior_id
  ) VALUES (
    contrato_antigo.imovel_id,
    contrato_antigo.inquilino_id,
    p_data_inicio,
    p_data_fim,
    contrato_antigo.dia_vencimento,
    contrato_antigo.valor_aluguel_atual,
    contrato_antigo.indice_reajuste,
    contrato_antigo.periodicidade_reajuste_meses,
    contrato_antigo.deposito_caucao,
    contrato_antigo.clausulas_especiais,
    'renovado',
    p_contrato_id
  ) RETURNING id INTO novo_contrato_id;

  -- Atualiza o contrato antigo para status 'encerrado'
  UPDATE public.contratos
  SET status = 'encerrado'
  WHERE id = p_contrato_id;
END;
$$;

-- Função para encerrar contrato
CREATE OR REPLACE FUNCTION public.encerrar_contrato(p_contrato_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.contratos
  SET status = 'encerrado'
  WHERE id = p_contrato_id;

  -- Libera o imóvel
  UPDATE public.imoveis
  SET status = 'disponivel'
  WHERE id = (SELECT imovel_id FROM public.contratos WHERE id = p_contrato_id);
END;
$$;

-- down
DROP FUNCTION IF EXISTS public.gerar_reajustes_pendentes();
DROP FUNCTION IF EXISTS public.aplicar_reajuste(uuid);
DROP FUNCTION IF EXISTS public.renovar_contrato(uuid, date, date);
DROP FUNCTION IF EXISTS public.encerrar_contrato(uuid);