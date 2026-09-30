-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos Customizados (Enums)
CREATE TYPE user_role AS ENUM ('admin', 'gestor', 'corretor');
CREATE TYPE imovel_status AS ENUM ('disponivel', 'alugado', 'manutencao', 'inativo');
CREATE TYPE imovel_finalidade AS ENUM ('residencial', 'comercial', 'industrial', 'outro');
CREATE TYPE pagamento_status AS ENUM ('pendente', 'pago', 'atrasado', 'isento');
CREATE TYPE manutencao_status AS ENUM ('aberta', 'em_andamento', 'concluida', 'cancelada');
CREATE TYPE reajuste_indice AS ENUM ('IGP-M', 'IPCA', 'Outro');
CREATE TYPE conta_responsavel AS ENUM ('inquilino', 'proprietario');

-- Tabela de Perfis de Usuários (Equipe)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nome TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'corretor',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Proprietários
CREATE TABLE IF NOT EXISTS public.proprietarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    telefone TEXT,
    email TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Imóveis (20 Campos)
CREATE TABLE IF NOT EXISTS public.imoveis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    proprietario_id UUID REFERENCES public.proprietarios(id) ON DELETE SET NULL,
    tipo TEXT NOT NULL,
    finalidade imovel_finalidade NOT NULL DEFAULT 'residencial',
    status imovel_status NOT NULL DEFAULT 'disponivel',
    cep TEXT,
    logradouro TEXT NOT NULL,
    numero TEXT NOT NULL,
    complemento TEXT,
    bairro TEXT NOT NULL,
    cidade TEXT NOT NULL,
    uf VARCHAR(2) NOT NULL,
    area_total NUMERIC(10, 2),
    area_util NUMERIC(10, 2),
    valor_aluguel NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    valor_condominio NUMERIC(12, 2) DEFAULT 0.00,
    iptu_mensal NUMERIC(12, 2) DEFAULT 0.00,
    matricula TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Inquilinos
CREATE TABLE IF NOT EXISTS public.inquilinos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome TEXT NOT NULL,
    cpf_cnpj TEXT UNIQUE NOT NULL,
    rg TEXT,
    estado_civil TEXT,
    profissao TEXT,
    telefone TEXT NOT NULL,
    email TEXT,
    fiador_nome TEXT,
    fiador_cpf TEXT,
    fiador_telefone TEXT,
    fiador_profissao TEXT,
    fiador_estado_civil TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Contratos
CREATE TABLE IF NOT EXISTS public.contratos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo TEXT UNIQUE NOT NULL,
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE RESTRICT,
    inquilino_id UUID NOT NULL REFERENCES public.inquilinos(id) ON DELETE RESTRICT,
    data_inicio DATE NOT NULL,
    data_fim DATE NOT NULL,
    dia_vencimento INTEGER NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    valor_atual NUMERIC(12, 2) NOT NULL,
    indice_reajuste reajuste_indice NOT NULL DEFAULT 'IGP-M',
    periodicidade_reajuste_meses INTEGER NOT NULL DEFAULT 12,
    valor_caucao NUMERIC(12, 2) DEFAULT 0.00,
    clausulas_especiais TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    competencia DATE NOT NULL,
    data_vencimento DATE NOT NULL,
    data_pagamento DATE,
    valor_base NUMERIC(12, 2) NOT NULL,
    valor_desconto NUMERIC(12, 2) DEFAULT 0.00,
    valor_multa_juros NUMERIC(12, 2) DEFAULT 0.00,
    valor_pago NUMERIC(12, 2) DEFAULT 0.00,
    status pagamento_status NOT NULL DEFAULT 'pendente',
    comprovante_url TEXT,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Índices Econômicos
CREATE TABLE IF NOT EXISTS public.indices_economicos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes_ano DATE NOT NULL UNIQUE,
    igpm_acumulado_12m NUMERIC(6, 4) DEFAULT 0.0000,
    ipca_acumulado_12m NUMERIC(6, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Reajustes Anuais
CREATE TABLE IF NOT EXISTS public.reajustes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
    data_reajuste DATE NOT NULL,
    indice_aplicado reajuste_indice NOT NULL,
    taxa_aplicada NUMERIC(6, 4) NOT NULL,
    valor_anterior NUMERIC(12, 2) NOT NULL,
    valor_novo NUMERIC(12, 2) NOT NULL,
    aprovado BOOLEAN NOT NULL DEFAULT FALSE,
    aprovado_por UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Manutenções
CREATE TABLE IF NOT EXISTS public.manutencoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    custo_estimado NUMERIC(12, 2) DEFAULT 0.00,
    custo_final NUMERIC(12, 2) DEFAULT 0.00,
    responsavel TEXT,
    status manutencao_status NOT NULL DEFAULT 'aberta',
    data_solicitacao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_conclusao DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Contas de Consumo
CREATE TABLE IF NOT EXISTS public.contas_consumo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    imovel_id UUID NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    competencia DATE NOT NULL,
    valor NUMERIC(12, 2) NOT NULL,
    responsavel conta_responsavel NOT NULL DEFAULT 'inquilino',
    paga BOOLEAN NOT NULL DEFAULT FALSE,
    comprovante_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Arquivos
CREATE TABLE IF NOT EXISTS public.arquivos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_arquivo TEXT NOT NULL,
    url TEXT NOT NULL,
    tipo_mime TEXT,
    tamanho_bytes BIGINT,
    entidade_tipo TEXT NOT NULL,
    entidade_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proprietarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquilinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indices_economicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reajustes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas_consumo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso Total para Autenticados
CREATE POLICY "Acesso Autenticado Profiles" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Proprietarios" ON public.proprietarios FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Imoveis" ON public.imoveis FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Inquilinos" ON public.inquilinos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Contratos" ON public.contratos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Pagamentos" ON public.pagamentos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Indices" ON public.indices_economicos FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Reajustes" ON public.reajustes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Contas" ON public.contas_consumo FOR ALL TO authenticated USING (true);
CREATE POLICY "Acesso Autenticado Arquivos" ON public.arquivos FOR ALL TO authenticated USING (true);