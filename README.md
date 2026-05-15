# TeamTasks CRM

CRM interno para consultoria com Supabase, React, Vite, Tailwind e GitHub Pages.

## Rodar local

```bash
npm ci
cp .env.example .env
npm run dev
```

Sem `.env`, app roda com dados demo.

## Supabase

```bash
supabase link --project-ref mvptsjsankxtaccppizm
supabase db reset --linked
supabase functions deploy notify-deadlines --no-verify-jwt
supabase secrets set RESEND_API_KEY=... NOTIFICATION_FROM_EMAIL="TeamTasks <alerts@seudominio.com>"
```

## GitHub Pages

Crie secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Ative Pages com GitHub Actions.

Para domínio customizado, configure `Settings > Pages > Custom domain`.
Arquivo `CNAME` só pode ser criado após domínio real.
