# Gestão de Aluguéis — Sistema completo de contratos, pagamentos e reajustes

Sistema de gestão de carteiras de imóveis alugados com suporte a 100+ contratos, controle de pagamentos mensais, manutenções, contas de água/energia, e **reajuste anual automático conforme IGPM, IPCA ou índice pactuado, respeitando a Lei do Inquilinato (Lei 8.245/91)**.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router)
- **Banco de dados**: Supabase (Postgres)
- **Autenticação**: Supabase Auth (e-mail/senha)
- **Armazenamento de arquivos**: Supabase Storage (principal) + Google Drive (fallback para arquivos grandes)
- **Deploy**: Vercel

## Recursos principais

- ✅ Cadastro de imóveis, proprietários, inquilinos
- ✅ Contratos com IGPM/IPCA/índice customizado
- ✅ Reajuste anual automático (cálculo via SQL + painel de aprovação)
- ✅ Lançamento mensal de aluguéis + baixa de pagamentos
- ✅ Registro de manutenções (solicitação → conclusão)
- ✅ Controle de contas de água/energia
- ✅ Upload de fotos, contratos digitalizados, recibos e comprovantes
- ✅ Gestão de equipe (admin/gestor/corretor)
- ✅ Painel geral com indicadores

## Setup rápido

### 1. Configure Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um projeto
3. Copie a URL e Anon Key do painel Settings → API

### 2. Crie `.env.local`

```bash
cp .env.example .env.local
```

Cole:
```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Rode a migration

No SQL Editor do Supabase, copie e cole o conteúdo de `supabase/migrations/0001_init.sql`.

### 4. Rode localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000/login

### 5. Crie o primeiro usuário

No Supabase → Authentication → Users, convide seu e-mail.
Depois, em Database → Profiles, mude o papel para `admin` e ativo para `true`.

---

## Deploy na Vercel

```bash
git add .
git commit -m "Initial"
git push origin main
```

Vá a [vercel.com/new](https://vercel.com/new), importe o repositório e configure as variáveis de ambiente do Supabase.

---

## Google Drive (opcional)

Se os arquivos forem grandes, configure uma Conta de Serviço no Google Cloud Console e compartilhe uma pasta do Drive. Ver `README.md` completo para instruções detalhadas.

---

## Lei do Inquilinato

O sistema implementa:
- Reajuste máximo 1x a cada 12 meses (art. 18)
- Índice escolhido por contrato
- Cálculo automático com variação acumulada de 12 meses do IGPM/IPCA

---

## Documentação completa

Ver `README.md` para guias detalhados, troubleshooting e roadmap.
