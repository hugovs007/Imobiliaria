create sequence if not exists public.contrato_codigo_seq;

alter table public.contratos
  add column if not exists codigo_contrato text;

update public.contratos
set codigo_contrato = 'CTR-' || to_char(nextval('public.contrato_codigo_seq'), 'FM000000')
where codigo_contrato is null;

alter table public.contratos
  alter column codigo_contrato set default
    ('CTR-' || to_char(nextval('public.contrato_codigo_seq'), 'FM000000'));

alter table public.contratos
  alter column codigo_contrato set not null;

create unique index if not exists contratos_codigo_contrato_key
  on public.contratos (codigo_contrato);

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
  v_percentual numeric(8, 4);
  v_valor_novo numeric(12, 2);
  v_data_fim date;
  v_reajuste_pendente_id uuid;
begin
  if not public.auth_ativo() then
    raise exception 'Usuário inativo ou não autenticado.';
  end if;

  if p_data_inicio is null then
    raise exception 'Informe a data de início da renovação.';
  end if;

  v_data_fim := (p_data_inicio + interval '1 year' - interval '1 day')::date;
  if p_data_fim is not null and p_data_fim <> v_data_fim then
    raise exception 'A renovação deve ter duração de 12 meses.';
  end if;

  select * into v_contrato
  from public.contratos
  where id = p_contrato_id and status in ('ativo', 'renovado')
  for update;

  if not found then
    raise exception 'Contrato vigente não encontrado.';
  end if;

  if v_contrato.data_fim is not null and p_data_inicio <> v_contrato.data_fim + 1 then
    raise exception 'A renovação deve começar no dia seguinte ao término do contrato atual.';
  end if;

  if v_contrato.data_ultimo_reajuste is not null and p_data_inicio <= v_contrato.data_ultimo_reajuste then
    raise exception 'A data da renovação deve ser posterior ao último reajuste aplicado.';
  end if;

  if exists (
    select 1 from public.contratos as successor
    where successor.contrato_anterior_id = p_contrato_id
  ) then
    raise exception 'Este contrato já possui uma renovação.';
  end if;

  select id into v_reajuste_pendente_id
  from public.reajustes
  where contrato_id = p_contrato_id and status = 'pendente'
  order by data_referencia desc
  limit 1
  for update;

  if v_reajuste_pendente_id is not null then
    raise exception 'Aplique ou ignore o reajuste pendente antes de renovar o contrato.';
  end if;

  select valor_percentual into v_percentual
  from public.indices_economicos
  where indice = v_contrato.indice_reajuste
    and competencia <= p_data_inicio
  order by competencia desc
  limit 1;

  if not found then
    raise exception 'Cadastre o índice % até a competência da renovação antes de renovar.', v_contrato.indice_reajuste;
  end if;

  v_valor_novo := ceil(
    (v_contrato.valor_aluguel_atual * (1 + v_percentual / 100)) / 5
  ) * 5;

  insert into public.contratos (
    imovel_id, inquilino_id, contrato_anterior_id, codigo_contrato,
    data_inicio, data_fim, dia_vencimento, valor_aluguel_atual,
    indice_reajuste, periodicidade_reajuste_meses, data_ultimo_reajuste,
    deposito_caucao, clausulas_especiais, status, created_by
  ) values (
    v_contrato.imovel_id, v_contrato.inquilino_id, v_contrato.id,
    'CTR-' || to_char(nextval('public.contrato_codigo_seq'), 'FM000000'),
    p_data_inicio, v_data_fim, v_contrato.dia_vencimento, v_valor_novo,
    v_contrato.indice_reajuste, v_contrato.periodicidade_reajuste_meses,
    p_data_inicio - 1, v_contrato.deposito_caucao, v_contrato.clausulas_especiais,
    'renovado', auth.uid()
  ) returning id into v_novo_contrato_id;

  insert into public.reajustes (
    contrato_id, data_referencia, indice_usado, percentual_aplicado,
    valor_anterior, valor_novo, status, data_aplicacao, created_by
  ) values (
    v_novo_contrato_id, p_data_inicio, v_contrato.indice_reajuste,
    v_percentual, v_contrato.valor_aluguel_atual, v_valor_novo,
    'aplicado', current_date, auth.uid()
  );

  return v_novo_contrato_id;
end;
$$;

grant execute on function public.renovar_contrato(uuid, date, date) to authenticated;

create or replace function public.gerar_reajustes_pendentes()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  c record;
  data_base date;
  proxima_data date;
  pct numeric(8,4);
begin
  for c in
    select contract_row.*
    from public.contratos as contract_row
    where contract_row.status in ('ativo', 'renovado')
      and not exists (
        select 1 from public.contratos as successor
        where successor.contrato_anterior_id = contract_row.id
      )
  loop
    data_base := coalesce(c.data_ultimo_reajuste, c.data_inicio);
    proxima_data := (data_base + (c.periodicidade_reajuste_meses || ' months')::interval)::date;

    if proxima_data <= current_date then
      select valor_percentual into pct
      from public.indices_economicos
      where indice = c.indice_reajuste and competencia <= proxima_data
      order by competencia desc
      limit 1;

      if pct is not null then
        insert into public.reajustes (
          contrato_id, data_referencia, indice_usado, percentual_aplicado,
          valor_anterior, valor_novo, status
        )
        select c.id, proxima_data, c.indice_reajuste, pct, c.valor_aluguel_atual,
               round(c.valor_aluguel_atual * (1 + pct / 100), 2), 'pendente'
        where not exists (
          select 1 from public.reajustes as existing
          where existing.contrato_id = c.id and existing.data_referencia = proxima_data
        );
      end if;
    end if;
  end loop;
end;
$$;

grant execute on function public.gerar_reajustes_pendentes() to authenticated;

create or replace function public.encerrar_contrato(p_contrato_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_imovel_id uuid;
begin
  if not public.auth_ativo() then
    raise exception 'Usuário inativo ou não autenticado.';
  end if;

  select imovel_id
  into v_imovel_id
  from public.contratos
  where id = p_contrato_id and status in ('ativo', 'renovado')
  for update;

  if not found then
    raise exception 'O contrato selecionado não está vigente.';
  end if;

  if exists (
    select 1
    from public.contratos as successor
    where successor.contrato_anterior_id = p_contrato_id
  ) then
    raise exception 'Este contrato já possui uma renovação. Encerre o contrato vigente da cadeia.';
  end if;

  update public.contratos
  set status = 'encerrado'
  where id = p_contrato_id;

  if not exists (
    select 1
    from public.contratos as current_contract
    where current_contract.imovel_id = v_imovel_id
    and current_contract.status in ('ativo', 'renovado')
      and not exists (
        select 1
        from public.contratos as successor
        where successor.contrato_anterior_id = current_contract.id
      )
  ) then
    update public.imoveis
    set status = 'disponivel'
    where id = v_imovel_id;
  end if;
end;
$$;

grant execute on function public.encerrar_contrato(uuid) to authenticated;
notify pgrst, 'reload schema';
