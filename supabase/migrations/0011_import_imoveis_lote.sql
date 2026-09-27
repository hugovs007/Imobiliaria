-- Importação em lote de imóveis da planilha
-- Proprietário: PAULO SERGIO DE SOUZA TORRES (já existe) e ESPÓLIO DE PEDRO TORRES DE MEDEIROS

-- Criar proprietário ESPÓLIO se não existir
insert into public.proprietarios (nome, cpf_cnpj, telefone, email, observacoes)
select 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS', null, null, null, 'Espólio'
where not exists (
  select 1 from public.proprietarios where nome = 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS'
);

-- Inserir imóveis PSS (proprietário: PAULO SERGIO DE SOUZA TORRES)
with proprietario_pss as (
  select id from public.proprietarios where nome = 'PAULO SERGIO DE SOUZA TORRES' limit 1
)
insert into public.imoveis (
  codigo, proprietario_id, endereco, numero, complemento, bairro, cidade, estado, cep,
  tipo, quartos, area_m2, valor_aluguel_base, status, observacoes
)
select * from (values
  ('PSS-007', (select id from proprietario_pss), 'RUA BONIFACIO NÓBREGA', '857 - TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, 'DUVALE'),
  ('PSS-008', (select id from proprietario_pss), 'RUA BONIFACIO NOBREGA', '857- 1 ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-009', (select id from proprietario_pss), 'AV JOSÉ AMERICO', '492', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-010', (select id from proprietario_pss), 'AV JOSÉ AMERICO', '65', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'comercial'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, 'CACAU SHOW'),
  ('PSS-011', (select id from proprietario_pss), 'AV JOSÉ AMERICO', 'S/N', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-012', (select id from proprietario_pss), 'AV JOSÉ AMERICO', '28', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'casa'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, 'CASA VERDE'),
  ('PSS-013', (select id from proprietario_pss), 'SITIO SÃO MIGUEL, B. SÃO SEBASTIÃO', 'S/N', null, 'ZONA RURAL', 'SANTA LUZIA', 'PB', '58600000', 'rural'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-014', (select id from proprietario_pss), 'SITIO TORRELANDIA', 'S/N', null, 'ZONA RURAL', 'SANTA LUZIA', 'PB', '58600000', 'rural'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, 'CACHAÇA BAÍTA'),
  ('PSS-015', (select id from proprietario_pss), 'TRAV. BONIFÁCIO NÓBREGA', '57', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'casa'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-016', (select id from proprietario_pss), 'RUA ZEZÉ MEDEIROS', '187', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', '58600000', 'casa'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-017', (select id from proprietario_pss), 'RUA AMELIA AUGUSTA', '899', null, 'N S DE FÁTIMA', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-018', (select id from proprietario_pss), 'RUA AMELIA AUGUSTA', 'S/N', null, 'N S DE FÁTIMA', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, 'LANCHONETE'),
  ('PSS-019', (select id from proprietario_pss), 'RUA PEDRO HONORATO', '46', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-020', (select id from proprietario_pss), 'RUA ANTONIO MOISES', '59', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-021', (select id from proprietario_pss), 'AV. JOSÉ AMÉRICO', 'S/N', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'disponivel'::status_imovel, 'EM CONSTRUÇÃO'),
  ('PSS-022', (select id from proprietario_pss), 'RUA PRESID. CASTELO BRANCO', '209', null, 'FREI DAMIAO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-023', (select id from proprietario_pss), 'RUA JOAQUIM BENÍCIO', '79', null, 'SÃO JOSÉ', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-024', (select id from proprietario_pss), 'AV. JOSÉ AMERICO', '241', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'disponivel'::status_imovel, null),
  ('PSS-025', (select id from proprietario_pss), 'RUA BARTOLOMEU DE MEDEIROS', '84 TERREO 1', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-026', (select id from proprietario_pss), 'RUA BARTOLOMEU DE MEDEIROS', '84 TERREO 2', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('PSS-027', (select id from proprietario_pss), 'RUA BARTOLOMEU DE MEDEIROS', '84 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null)
) as t(codigo, proprietario_id, endereco, numero, complemento, bairro, cidade, estado, cep, tipo, quartos, area_m2, valor_aluguel_base, status, observacoes)
where not exists (select 1 from public.imoveis where codigo = t.codigo);

-- Inserir imóveis ESP (proprietário: ESPÓLIO DE PEDRO TORRES DE MEDEIROS)
with proprietario_esp as (
  select id from public.proprietarios where nome = 'ESPÓLIO DE PEDRO TORRES DE MEDEIROS' limit 1
)
insert into public.imoveis (
  codigo, proprietario_id, endereco, numero, complemento, bairro, cidade, estado, cep,
  tipo, quartos, area_m2, valor_aluguel_base, status, observacoes
)
select * from (values
  ('ESP-001', (select id from proprietario_esp), 'Ezequiel Fernandes', '02 TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-002', (select id from proprietario_esp), 'Ezequiel Fernandes', '02 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-003', (select id from proprietario_esp), 'Ezequiel Fernandes', '02 2°ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-004', (select id from proprietario_esp), 'Rua Isidoro Ortins, 29', '29', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-005', (select id from proprietario_esp), 'Praça Alcindo leite', '16', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'comercial'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-006', (select id from proprietario_esp), 'Rua Teodolo Fernandes', '158', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-007', (select id from proprietario_esp), 'Rua Bonifácio Nóbrega, 805', '805 TERREO', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-008', (select id from proprietario_esp), 'Rua Bonifácio Nóbrega, 805', '805 1° ANDAR', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-009', (select id from proprietario_esp), 'Rua Bonifácio Nóbrega, 811', '805', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'comercial'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-010', (select id from proprietario_esp), 'Rua José Jaime', '53', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null),
  ('ESP-011', (select id from proprietario_esp), 'Rua José Jaime', '57', null, 'CENTRO', 'SANTA LUZIA', 'PB', '58600000', 'apartamento'::tipo_imovel, null::integer, null::numeric, 800.00, 'alugado'::status_imovel, null)
) as t(codigo, proprietario_id, endereco, numero, complemento, bairro, cidade, estado, cep, tipo, quartos, area_m2, valor_aluguel_base, status, observacoes)
where not exists (select 1 from public.imoveis where codigo = t.codigo);
