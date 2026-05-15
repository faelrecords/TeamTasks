alter table public.projects
  add column if not exists updated_at timestamptz not null default now();

alter table public.tasks
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists column_id uuid;

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
  drop constraint if exists tasks_column_id_fkey,
  add constraint tasks_column_id_fkey foreign key (column_id) references public.kanban_columns(id) on delete set null;

create index if not exists kanban_columns_project_idx on public.kanban_columns(project_id, position);
create index if not exists tasks_column_idx on public.tasks(column_id);

alter table public.kanban_columns enable row level security;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_touch_updated_at on public.projects;
create trigger projects_touch_updated_at
before update on public.projects
for each row execute function public.touch_updated_at();

drop trigger if exists tasks_touch_updated_at on public.tasks;
create trigger tasks_touch_updated_at
before update on public.tasks
for each row execute function public.touch_updated_at();

drop trigger if exists kanban_columns_touch_updated_at on public.kanban_columns;
create trigger kanban_columns_touch_updated_at
before update on public.kanban_columns
for each row execute function public.touch_updated_at();

create policy "authenticated read kanban columns" on public.kanban_columns
for select to authenticated using (true);

create policy "project writer writes kanban columns" on public.kanban_columns
for all to authenticated
using (public.can_write_project(project_id))
with check (public.can_write_project(project_id));

with defaults as (
  select
    p.id as project_id,
    c.title,
    c.position
  from public.projects p
  cross join (values
    ('A fazer', 1),
    ('Em andamento', 2),
    ('Revisão', 3),
    ('Concluído', 4)
  ) as c(title, position)
)
insert into public.kanban_columns (project_id, title, position)
select project_id, title, position from defaults d
where not exists (
  select 1 from public.kanban_columns kc
  where kc.project_id = d.project_id and kc.title = d.title
);

update public.tasks t
set column_id = kc.id
from public.kanban_columns kc
where kc.project_id = t.project_id
and (
  (t.status = 'a_fazer' and kc.title = 'A fazer') or
  (t.status = 'em_andamento' and kc.title = 'Em andamento') or
  (t.status = 'revisao' and kc.title = 'Revisão') or
  (t.status = 'concluido' and kc.title = 'Concluído')
)
and t.column_id is null;
