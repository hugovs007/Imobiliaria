# Deploy Checklist

## ☐ Setup Supabase

- [ ] Criar conta em supabase.com
- [ ] Criar projeto (escolher "Free")
- [ ] Copiar Project URL (Settings → API)
- [ ] Copiar Anon Key (Settings → API)

## ☐ Rodar migration

- [ ] Copiar conteúdo de `supabase/migrations/0001_init.sql`
- [ ] Colar no SQL Editor do Supabase
- [ ] Verificar se não houve erros
- [ ] Ir a Storage → Buckets e criar bucket `arquivos` (público)

## ☐ Criar `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://seu-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## ☐ Testar localmente

```bash
npm install
npm run dev
```

- [ ] Acessar http://localhost:3000/login
- [ ] Convidar primeiro usuário no Supabase Auth
- [ ] Marcar como admin=true, ativo=true em Database → Profiles
- [ ] Fazer login

## ☐ Fazer push no GitHub

```bash
git init
git add .
git commit -m "Initial commit: rental management system"
git branch -M main
git remote add origin https://github.com/seu-usuario/sistema-alugueis.git
git push -u origin main
```

## ☐ Publicar na Vercel

- [ ] Ir a vercel.com/new
- [ ] Importar repositório
- [ ] Adicionar variáveis de ambiente (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [ ] Clicar Deploy
- [ ] Aguardar ~2-3 minutos

## ☐ Testar produção

- [ ] Acessar `seu-projeto.vercel.app/login`
- [ ] Fazer login com o primeiro usuário criado
- [ ] Testar uma ação (ex: criar imóvel)

## ☐ Convide membros da equipe

- [ ] No Supabase → Authentication → Users, clique "Invite user"
- [ ] Preencha e-mail
- [ ] Em Database → Profiles, mude o papel (admin/gestor/corretor) e ativo=true

## ✅ Pronto!

O sistema está disponível em `seu-projeto.vercel.app`.

## Troubleshooting

**Erro de autenticação**
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o usuário foi criado no Supabase Auth

**Erro ao subir arquivo**
- Verifique se o bucket `arquivos` existe
- Verifique se é público (read)

**Reajuste não aparece**
- Cadastre índices econômicos antes (página Índices)
- Verifique se o contrato está ativo

Ver `README.md` para documentação completa.
