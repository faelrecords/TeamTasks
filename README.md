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
supabase link --project-ref PROJECT_ID
supabase db push
supabase functions deploy notify-deadlines
supabase secrets set RESEND_API_KEY=... NOTIFICATION_FROM_EMAIL="TeamTasks <alerts@seudominio.com>"
```

No SQL editor, defina variáveis usadas pelo `pg_cron`:

```sql
alter database postgres set app.supabase_url = 'https://PROJECT_ID.supabase.co';
alter database postgres set app.service_role_key = 'SERVICE_ROLE_KEY';
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
