#!/bin/bash

echo "========================================="
echo "Gestão de Aluguéis — Setup"
echo "========================================="
echo

echo "Passo 1: Instalar dependências..."
npm install

echo
echo "Passo 2: Criar arquivo .env.local"
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo "✓ Arquivo .env.local criado"
  echo "  Edite .env.local e preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY"
else
  echo "ℹ Arquivo .env.local já existe"
fi

echo
echo "Passo 3: Próximos passos..."
echo "1. Configure Supabase em https://supabase.com"
echo "2. Copie a URL e Anon Key do painel Settings → API para .env.local"
echo "3. Rode a migration SQL (supabase/migrations/0001_init.sql) no SQL Editor do Supabase"
echo "4. Rode: npm run dev"
echo "5. Acesse http://localhost:3000/login"
echo
echo "Ver DEPLOY.md para checklist completo."
