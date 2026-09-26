-- =========================================================
-- Sistema de Gestão de Aluguéis — Schema inicial (Supabase/Postgres)
-- =========================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type papel_equipe as enum ('admin', 'gestor', 'corretor');
create type status_imovel as enum ('disponivel', 'alugado', 'manutencao', 'inativo');
create type tipo_imovel as enum ('residencial', 'comercial');
create type indice_reajuste as enum ('igpm', 'ipca', 'outro');
create type status_contrato as enum ('ativo', 'encerrado', 'renovado', 'rescindido');
create type status_reajuste as enum ('pendente', 'aplicado', 'ignorado');
create type status_pagamento as enum ('pago', 'pendente', 'atrasado', 'isento');
create type status_manutencao as enum ('aberta', 'em_andamento', 'concluida', 'cancelada');
create type tipo_conta as enum ('agua', 'energia', 'outra');
create type responsavel_conta as enum ('proprietario', 'inquilino');
create type entidade_arquivo as enum ('contrato', 'imovel', 'manutencao', 'pagamento', 'conta', 'inquilino', 'proprietario');
create type storage_provider as enum ('supabase', 'google_drive');

-- ---------- EQUIPE (perfis vinculados ao auth.users) ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  papel papel_equipe not null default 'corretor',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Cria automaticamente um perfil (papel padrão: corretor, inativo até ser aprovado)
-- sempre que um novo usuário é criado/convidado no Supabase Auth.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, papel, ativo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'corretor',
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- PROPRIETÁRIOS ----------
create table proprietarios (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  dados_bancarios jsonb,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

-- ---------- INQUILINOS ----------
create table inquilinos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf_cnpj text,
  telefone text,
  email text,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

-- ---------- IMÓVEIS ----------
create table imoveis (
  id uuid primary key default gen_random_uuid(),
  proprietario_id uuid references proprietarios (id) on delete set null,
  codigo text unique, -- referência interna, ex: "IM-0001"
  endereco text not null,
  numero text,
  complemento text,
  bairro text,
  cidade text not null,
  estado text not null,
  cep text,
  tipo tipo_imovel not null default 'residencial',
  quartos int,
  area_m2 numeric(10, 2),
  valor_aluguel_base numeric(12, 2) not null,
  status status_imovel not null default 'disponivel',
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_imoveis_proprietario on imoveis (proprietario_id);
create index idx_imoveis_status on imoveis (status);

-- ---------- CONTRATOS ----------
create table contratos (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete restrict,
  inquilino_id uuid not null references inquilinos (id) on delete restrict,
  data_inicio date not null,
  data_fim date, -- prazo determinado; null = prazo indeterminado
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  valor_aluguel_atual numeric(12, 2) not null,
  indice_reajuste indice_reajuste not null default 'igpm',
  periodicidade_reajuste_meses int not null default 12,
  data_ultimo_reajuste date,
  deposito_caucao numeric(12, 2),
  clausulas_especiais text,
  status status_contrato not null default 'ativo',
  arquivo_contrato_path text, -- caminho no Storage (Supabase ou Drive)
  arquivo_contrato_provider storage_provider default 'supabase',
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_contratos_imovel on contratos (imovel_id);
create index idx_contratos_inquilino on contratos (inquilino_id);
create index idx_contratos_status on contratos (status);

-- Regra da Lei do Inquilinato (Lei 8.245/91, art. 18): só um imóvel "alugado" por contrato ativo por vez.
create unique index uniq_contrato_ativo_por_imovel
  on contratos (imovel_id)
  where status = 'ativo';

-- ---------- ÍNDICES ECONÔMICOS (IGPM / IPCA) ----------
-- Alimentado periodicamente via API do Banco Central (SGS) ou manualmente.
create table indices_economicos (
  id uuid primary key default gen_random_uuid(),
  indice indice_reajuste not null,
  competencia date not null, -- primeiro dia do mês de referência
  valor_percentual numeric(8, 4) not null, -- variação acumulada nos últimos 12 meses, em %
  fonte text default 'Banco Central (SGS)',
  created_at timestamptz not null default now(),
  unique (indice, competencia)
);

-- ---------- REAJUSTES APLICADOS ----------
create table reajustes (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos (id) on delete cascade,
  data_referencia date not null, -- data em que o reajuste é devido (aniversário do contrato)
  indice_usado indice_reajuste not null,
  percentual_aplicado numeric(8, 4) not null,
  valor_anterior numeric(12, 2) not null,
  valor_novo numeric(12, 2) not null,
  status status_reajuste not null default 'pendente',
  data_aplicacao date,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_reajustes_contrato on reajustes (contrato_id);

-- ---------- PAGAMENTOS / RECIBOS DE ALUGUEL ----------
create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  contrato_id uuid not null references contratos (id) on delete cascade,
  competencia date not null, -- mês de referência do aluguel (primeiro dia do mês)
  valor_devido numeric(12, 2) not null,
  valor_pago numeric(12, 2),
  data_vencimento date not null,
  data_pagamento date,
  status status_pagamento not null default 'pendente',
  forma_pagamento text,
  recibo_path text,
  recibo_provider storage_provider default 'supabase',
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  unique (contrato_id, competencia)
);
create index idx_pagamentos_contrato on pagamentos (contrato_id);
create index idx_pagamentos_status on pagamentos (status);

-- ---------- MANUTENÇÕES ----------
create table manutencoes (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  contrato_id uuid references contratos (id) on delete set null,
  tipo text not null, -- elétrica, hidráulica, pintura, estrutural, etc.
  descricao text not null,
  status status_manutencao not null default 'aberta',
  custo numeric(12, 2),
  responsavel text, -- prestador de serviço
  data_solicitacao date not null default current_date,
  data_conclusao date,
  observacoes text,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_manutencoes_imovel on manutencoes (imovel_id);
create index idx_manutencoes_status on manutencoes (status);

-- ---------- CONTAS DE ÁGUA / ENERGIA ----------
create table contas_consumo (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis (id) on delete cascade,
  contrato_id uuid references contratos (id) on delete set null,
  tipo tipo_conta not null,
  competencia date not null,
  valor numeric(12, 2) not null,
  vencimento date not null,
  status status_pagamento not null default 'pendente',
  responsavel_pagamento responsavel_conta not null default 'inquilino',
  arquivo_path text,
  arquivo_provider storage_provider default 'supabase',
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_contas_imovel on contas_consumo (imovel_id);

-- ---------- ARQUIVOS (metadados; fotos, contratos digitalizados, comprovantes) ----------
-- path_ou_url guarda o caminho no Supabase Storage OU o link/ID do arquivo no Google Drive.
create table arquivos (
  id uuid primary key default gen_random_uuid(),
  entidade_tipo entidade_arquivo not null,
  entidade_id uuid not null,
  nome text not null,
  tipo_arquivo text, -- foto, contrato, recibo, conta, comprovante
  storage_provider storage_provider not null default 'supabase',
  path_ou_url text not null,
  tamanho_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);
create index idx_arquivos_entidade on arquivos (entidade_tipo, entidade_id);

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table profiles enable row level security;
alter table proprietarios enable row level security;
alter table inquilinos enable row level security;
alter table imoveis enable row level security;
alter table contratos enable row level security;
alter table indices_economicos enable row level security;
alter table reajustes enable row level security;
alter table pagamentos enable row level security;
alter table manutencoes enable row level security;
alter table contas_consumo enable row level security;
alter table arquivos enable row level security;

-- Função auxiliar: papel do usuário logado
create or replace function auth_papel()
returns papel_equipe
language sql stable
as $$
  select papel from profiles where id = auth.uid();
$$;

create or replace function auth_ativo()
returns boolean
language sql stable
as $$
  select coalesce((select ativo from profiles where id = auth.uid()), false);
$$;

-- profiles: cada um vê/edita o próprio perfil; admin vê e gerencia todos
create policy "profiles_select_own_or_admin" on profiles
  for select using (id = auth.uid() or auth_papel() = 'admin');
create policy "profiles_update_own_or_admin" on profiles
  for update using (id = auth.uid() or auth_papel() = 'admin');
create policy "profiles_insert_admin" on profiles
  for insert with check (auth_papel() = 'admin');
create policy "profiles_delete_admin" on profiles
  for delete using (auth_papel() = 'admin');

-- Regra geral para as demais tabelas: qualquer membro de equipe ativo (admin/gestor/corretor)
-- pode ler e escrever. Ajuste depois se quiser restringir corretor (ex.: sem delete).
create policy "equipe_all_select" on proprietarios for select using (auth_ativo());
create policy "equipe_all_write" on proprietarios for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on inquilinos for select using (auth_ativo());
create policy "equipe_all_write" on inquilinos for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on imoveis for select using (auth_ativo());
create policy "equipe_all_write" on imoveis for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on contratos for select using (auth_ativo());
create policy "equipe_all_write" on contratos for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on indices_economicos for select using (auth_ativo());
create policy "equipe_write_admin_gestor" on indices_economicos for all
  using (auth_papel() in ('admin', 'gestor')) with check (auth_papel() in ('admin', 'gestor'));

create policy "equipe_all_select" on reajustes for select using (auth_ativo());
create policy "equipe_all_write" on reajustes for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on pagamentos for select using (auth_ativo());
create policy "equipe_all_write" on pagamentos for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on manutencoes for select using (auth_ativo());
create policy "equipe_all_write" on manutencoes for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on contas_consumo for select using (auth_ativo());
create policy "equipe_all_write" on contas_consumo for all using (auth_ativo()) with check (auth_ativo());

create policy "equipe_all_select" on arquivos for select using (auth_ativo());
create policy "equipe_all_write" on arquivos for all using (auth_ativo()) with check (auth_ativo());

-- =========================================================
-- FUNÇÃO: calcular próximo reajuste pendente de um contrato
-- (Lei 8.245/91 art. 18/19: reajuste anual, pelo índice pactuado em contrato)
-- =========================================================
create or replace function gerar_reajustes_pendentes()
returns void
language plpgsql
as $$
declare
  c record;
  data_base date;
  proxima_data date;
  pct numeric(8,4);
begin
  for c in
    select * from contratos where status = 'ativo'
  loop
    data_base := coalesce(c.data_ultimo_reajuste, c.data_inicio);
    proxima_data := data_base + (c.periodicidade_reajuste_meses || ' months')::interval;

    if proxima_data <= current_date then
      -- busca o índice acumulado mais recente disponível até a data de referência
      select valor_percentual into pct
      from indices_economicos
      where indice = c.indice_reajuste
        and competencia <= proxima_data
      order by competencia desc
      limit 1;

      if pct is not null then
        insert into reajustes (contrato_id, data_referencia, indice_usado, percentual_aplicado, valor_anterior, valor_novo, status)
        select c.id, proxima_data, c.indice_reajuste, pct, c.valor_aluguel_atual,
               round(c.valor_aluguel_atual * (1 + pct / 100), 2), 'pendente'
        where not exists (
          select 1 from reajustes r where r.contrato_id = c.id and r.data_referencia = proxima_data
        );
      end if;
    end if;
  end loop;
end;
$$;

-- =========================================================
-- FUNÇÃO: aplicar um reajuste (atualiza o contrato)
-- =========================================================
create or replace function aplicar_reajuste(p_reajuste_id uuid)
returns void
language plpgsql
as $$
declare
  r record;
begin
  select * into r from reajustes where id = p_reajuste_id;
  if r is null then
    raise exception 'Reajuste não encontrado';
  end if;

  update contratos
  set valor_aluguel_atual = r.valor_novo,
      data_ultimo_reajuste = r.data_referencia
  where id = r.contrato_id;

  update reajustes
  set status = 'aplicado', data_aplicacao = current_date
  where id = p_reajuste_id;
end;
$$;
