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

    insert into public.reajustes (
      contrato_id, data_referencia, indice_usado, percentual_aplicado,
      valor_anterior, valor_novo, status, data_aplicacao, created_by
    ) values (
      p_contrato_id, p_data_inicio, v_contrato.indice_reajuste, v_percentual,
      v_contrato.valor_aluguel_atual, v_valor_novo, 'aplicado', current_date, auth.uid()
    );

    update public.contratos
    set valor_aluguel_atual = v_valor_novo,
        data_ultimo_reajuste = p_data_inicio
    where id = p_contrato_id;

    v_contrato.valor_aluguel_atual := v_valor_novo;
    v_contrato.data_ultimo_reajuste := p_data_inicio;
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
    v_contrato.dia_vencimento, v_contrato.valor_aluguel_atual,
    v_contrato.indice_reajuste, v_contrato.periodicidade_reajuste_meses,
    v_contrato.data_ultimo_reajuste, v_contrato.deposito_caucao,
    v_contrato.clausulas_especiais, 'ativo', auth.uid()
  ) returning id into v_novo_contrato_id;

  return v_novo_contrato_id;
end;
$$;

grant execute on function public.renovar_contrato(uuid, date, date) to authenticated;
