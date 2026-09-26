with renewal_adjustments as (
  select distinct on (previous_contract.id)
    previous_contract.id as previous_contract_id,
    renewed_contract.id as renewed_contract_id,
    adjustment.id as adjustment_id,
    adjustment.valor_anterior,
    (
      select max(previous_adjustment.data_referencia)
      from public.reajustes as previous_adjustment
      where previous_adjustment.contrato_id = previous_contract.id
        and previous_adjustment.status = 'aplicado'
        and previous_adjustment.data_referencia < adjustment.data_referencia
        and previous_adjustment.id <> adjustment.id
    ) as previous_adjustment_date
  from public.contratos as previous_contract
  join public.reajustes as adjustment
    on adjustment.contrato_id = previous_contract.id
  join public.contratos as renewed_contract
    on renewed_contract.imovel_id = previous_contract.imovel_id
    and renewed_contract.inquilino_id = previous_contract.inquilino_id
    and renewed_contract.data_inicio = adjustment.data_referencia
    and renewed_contract.id <> previous_contract.id
  where previous_contract.status = 'renovado'
    and adjustment.status = 'aplicado'
    and adjustment.valor_novo <> adjustment.valor_anterior
    and adjustment.created_at = renewed_contract.created_at
    and previous_contract.valor_aluguel_atual = adjustment.valor_novo
    and previous_contract.data_ultimo_reajuste = adjustment.data_referencia
  order by previous_contract.id, adjustment.created_at desc
)
update public.contratos as previous_contract
set valor_aluguel_atual = renewal_adjustments.valor_anterior,
    data_ultimo_reajuste = renewal_adjustments.previous_adjustment_date
from renewal_adjustments
where previous_contract.id = renewal_adjustments.previous_contract_id;

with renewal_adjustments as (
  select distinct on (previous_contract.id)
    previous_contract.id as previous_contract_id,
    renewed_contract.id as renewed_contract_id,
    adjustment.id as adjustment_id
  from public.contratos as previous_contract
  join public.reajustes as adjustment
    on adjustment.contrato_id = previous_contract.id
  join public.contratos as renewed_contract
    on renewed_contract.imovel_id = previous_contract.imovel_id
    and renewed_contract.inquilino_id = previous_contract.inquilino_id
    and renewed_contract.data_inicio = adjustment.data_referencia
    and renewed_contract.id <> previous_contract.id
  where previous_contract.status = 'renovado'
    and adjustment.status = 'aplicado'
    and adjustment.valor_novo <> adjustment.valor_anterior
    and adjustment.created_at = renewed_contract.created_at
  order by previous_contract.id, adjustment.created_at desc
)
update public.reajustes as adjustment
set contrato_id = renewal_adjustments.renewed_contract_id
from renewal_adjustments
where adjustment.id = renewal_adjustments.adjustment_id;

create or replace function public.renovar_contrato(
  p_contrato_id uuid,
  p_data_inicio date,
  p_data_fim date default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_contrato public.contratos%rowtype;
  v_novo_contrato_id uuid;
  v_data_base date;
  v_proxima_data date;
  v_percentual numeric(8, 4);
  v_valor_novo numeric(12, 2);
  v_data_ultimo_reajuste date;
  v_aplicar_reajuste boolean := false;
begin
  if not public.auth_ativo() then
    raise exception 'Usuário inativo ou não autenticado.';
  end if;

  if p_data_inicio is null then
    raise exception 'Informe a data de início da renovação.';
  end if;

  if p_data_fim is not null and p_data_fim < p_data_inicio then
    raise exception 'A data final deve ser posterior à data de início.';
  end if;

  select *
  into v_contrato
  from public.contratos
  where id = p_contrato_id and status = 'ativo'
  for update;

  if not found then
    raise exception 'Contrato ativo não encontrado.';
  end if;

  if v_contrato.data_fim is not null and p_data_inicio <= v_contrato.data_fim then
    raise exception 'O novo período deve começar depois do término do contrato atual.';
  end if;

  if v_contrato.data_ultimo_reajuste is not null and p_data_inicio < v_contrato.data_ultimo_reajuste then
    raise exception 'O início da renovação não pode ser anterior ao último reajuste aplicado.';
  end if;

  if exists (
    select 1
    from public.reajustes
    where contrato_id = p_contrato_id and status = 'pendente'
  ) then
    raise exception 'Aplique ou ignore o reajuste pendente antes de renovar o contrato.';
  end if;

  v_valor_novo := v_contrato.valor_aluguel_atual;
  v_data_ultimo_reajuste := v_contrato.data_ultimo_reajuste;
  v_data_base := coalesce(v_contrato.data_ultimo_reajuste, v_contrato.data_inicio);
  v_proxima_data := v_data_base + (v_contrato.periodicidade_reajuste_meses || ' months')::interval;

  if p_data_inicio >= v_proxima_data then
    select valor_percentual
    into v_percentual
    from public.indices_economicos
    where indice = v_contrato.indice_reajuste
      and competencia <= p_data_inicio
    order by competencia desc
    limit 1;

    if not found then
      raise exception 'Cadastre o índice % até a competência da renovação antes de renovar.', v_contrato.indice_reajuste;
    end if;

    v_valor_novo := round(v_contrato.valor_aluguel_atual * (1 + v_percentual / 100), 2);
    v_data_ultimo_reajuste := p_data_inicio;
    v_aplicar_reajuste := true;
  end if;

  update public.contratos
  set status = 'renovado'
  where id = p_contrato_id;

  insert into public.contratos (
    imovel_id, inquilino_id, data_inicio, data_fim, dia_vencimento,
    valor_aluguel_atual, indice_reajuste, periodicidade_reajuste_meses,
    data_ultimo_reajuste, deposito_caucao, clausulas_especiais, status, created_by
  ) values (
    v_contrato.imovel_id, v_contrato.inquilino_id, p_data_inicio, p_data_fim,
    v_contrato.dia_vencimento, v_valor_novo,
    v_contrato.indice_reajuste, v_contrato.periodicidade_reajuste_meses,
    v_data_ultimo_reajuste, v_contrato.deposito_caucao,
    v_contrato.clausulas_especiais, 'ativo', auth.uid()
  ) returning id into v_novo_contrato_id;

  if v_aplicar_reajuste then
    insert into public.reajustes (
      contrato_id, data_referencia, indice_usado, percentual_aplicado,
      valor_anterior, valor_novo, status, data_aplicacao, created_by
    ) values (
      v_novo_contrato_id, p_data_inicio, v_contrato.indice_reajuste, v_percentual,
      v_contrato.valor_aluguel_atual, v_valor_novo, 'aplicado', current_date, auth.uid()
    );
  end if;

  return v_novo_contrato_id;
end;
$$;

grant execute on function public.renovar_contrato(uuid, date, date) to authenticated;
notify pgrst, 'reload schema';
