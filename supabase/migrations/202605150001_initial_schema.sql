create extension if not exists pgcrypto;
create extension if not exists pg_cron;
create extension if not exists pg_net;

create type public.profile_role as enum ('admin', 'consultant');
create type public.vertical as enum ('financeiro', 'pessoas', 'vendas', 'marketing', 'processos');
create type public.client_stage as enum ('prospeccao', 'proposta', 'contrato', 'em_andamento', 'encerrado');
create type public.client_status as enum ('lead', 'ativo', 'encerrado');
create type public.project_status as enum ('planejado', 'em_andamento', 'em_risco', 'encerrado');
create type public.task_priority as enum ('baixa', 'media', 'alta', 'critica');
create type public.task_status as enum ('a_fazer', 'em_andamento', 'revisao', 'concluido');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role public.profile_role not null default 'consultant',
  vertical public.vertical not null,
  created_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  segment text not null,
  stage public.client_stage not null default 'prospeccao',
  status public.client_status not null default 'lead',
  owner_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  consultant_id uuid not null references public.profiles(id),
  vertical public.vertical not null,
  name text not null,
  status public.project_status not null default 'planejado',
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  assignee_id uuid not null references public.profiles(id),
  priority public.task_priority not null default 'media',
  status public.task_status not null default 'a_fazer',
  due_date date not null,
  created_at timestamptz not null default now(),
  completed_at date
);

create table public.checklists (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  item text not null,
  done boolean not null default false
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete cascade,
  kind text not null check (kind in ('due_d2', 'due_today', 'overdue')),
  title text not null,
  body text not null,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index clients_owner_idx on public.clients(owner_id);
create index projects_consultant_idx on public.projects(consultant_id);
create index tasks_project_idx on public.tasks(project_id);
create index tasks_assignee_idx on public.tasks(assignee_id);
create index tasks_due_idx on public.tasks(due_date) where status <> 'concluido';
create unique index notifications_daily_unique_idx
  on public.notifications (user_id, task_id, kind, (created_at::date));

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.checklists enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.notifications enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

create or replace function public.can_write_project(project_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.projects
    where id = project_uuid
    and consultant_id = auth.uid()
  );
$$;

create or replace function public.can_write_task(task_uuid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() or exists (
    select 1 from public.tasks
    where id = task_uuid
    and assignee_id = auth.uid()
  );
$$;

create or replace function public.set_task_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    new.completed_at = current_date;
  elsif new.status <> 'concluido' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_set_completed_at
before update of status on public.tasks
for each row execute function public.set_task_completed_at();

create policy "authenticated read profiles" on public.profiles
for select to authenticated using (true);

create policy "admin writes profiles" on public.profiles
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "authenticated read clients" on public.clients
for select to authenticated using (true);

create policy "client owner or admin write" on public.clients
for all to authenticated
using (public.is_admin() or owner_id = auth.uid())
with check (public.is_admin() or owner_id = auth.uid());

create policy "authenticated read projects" on public.projects
for select to authenticated using (true);

create policy "project consultant or admin write" on public.projects
for all to authenticated
using (public.is_admin() or consultant_id = auth.uid())
with check (public.is_admin() or consultant_id = auth.uid());

create policy "authenticated read tasks" on public.tasks
for select to authenticated using (true);

create policy "task assignee or admin write" on public.tasks
for all to authenticated
using (public.is_admin() or assignee_id = auth.uid())
with check (public.is_admin() or assignee_id = auth.uid());

create policy "authenticated read checklists" on public.checklists
for select to authenticated using (true);

create policy "task writer writes checklists" on public.checklists
for all to authenticated
using (public.can_write_task(task_id))
with check (public.can_write_task(task_id));

create policy "authenticated read comments" on public.comments
for select to authenticated using (true);

create policy "task writer writes comments" on public.comments
for insert to authenticated
with check (public.can_write_task(task_id) and user_id = auth.uid());

create policy "own comment or admin update comments" on public.comments
for update to authenticated
using (public.is_admin() or user_id = auth.uid())
with check (public.is_admin() or user_id = auth.uid());

create policy "authenticated read attachments" on public.attachments
for select to authenticated using (true);

create policy "task writer writes attachments" on public.attachments
for all to authenticated
using (public.can_write_task(task_id))
with check (public.can_write_task(task_id) and uploaded_by = auth.uid());

create policy "own notifications read" on public.notifications
for select to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "own notifications update" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy "authenticated attachment select" on storage.objects
for select to authenticated
using (bucket_id = 'task-attachments');

create policy "authenticated attachment insert" on storage.objects
for insert to authenticated
with check (bucket_id = 'task-attachments');

create or replace function public.task_performance(from_date date default current_date - interval '90 days', to_date date default current_date)
returns table (
  consultant_id uuid,
  consultant_name text,
  vertical public.vertical,
  open_tasks bigint,
  completed_tasks bigint,
  on_time_rate numeric,
  avg_completion_days numeric
)
language sql
security definer
set search_path = public
stable
as $$
  select
    p.id,
    p.name,
    p.vertical,
    count(t.*) filter (where t.status <> 'concluido') as open_tasks,
    count(t.*) filter (where t.status = 'concluido') as completed_tasks,
    coalesce(
      round(
        count(t.*) filter (where t.status = 'concluido' and t.completed_at <= t.due_date)::numeric
        / nullif(count(t.*) filter (where t.status = 'concluido'), 0) * 100,
        2
      ),
      0
    ) as on_time_rate,
    coalesce(
      round(avg(t.completed_at - t.created_at::date) filter (where t.status = 'concluido'), 2),
      0
    ) as avg_completion_days
  from public.profiles p
  left join public.tasks t on t.assignee_id = p.id and t.created_at::date between from_date and to_date
  where p.role = 'consultant'
  group by p.id, p.name, p.vertical
  order by p.name;
$$;

create or replace function public.enqueue_deadline_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, task_id, kind, title, body)
  select
    t.assignee_id,
    t.id,
    case
      when t.due_date = current_date + 2 then 'due_d2'
      when t.due_date = current_date then 'due_today'
      else 'overdue'
    end,
    case
      when t.due_date = current_date + 2 then 'Tarefa vence em 2 dias'
      when t.due_date = current_date then 'Tarefa vence hoje'
      else 'Tarefa atrasada'
    end,
    t.title
  from public.tasks t
  where t.status <> 'concluido'
  and (t.due_date in (current_date + 2, current_date) or t.due_date < current_date)
  on conflict do nothing;
$$;

select cron.schedule(
  'notify-task-deadlines',
  '0 9 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/notify-deadlines',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
