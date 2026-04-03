create table if not exists sports (
  id text primary key,
  name text not null,
  category text not null check (category in ('Outdoor', 'Indoor', 'Special Event')),
  status text not null check (status in ('active', 'alert', 'cancelled')),
  note text not null default '',
  updated_by text not null default 'IM Supervisor',
  facility_impact text not null default '',
  archived boolean not null default false,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists global_banner (
  id integer primary key,
  enabled boolean not null default false,
  title text not null default '',
  message text not null default '',
  updated_by text not null default 'IM Supervisor',
  updated_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('sport', 'banner')),
  entity_id text not null,
  action text not null,
  actor_email text not null,
  summary text not null,
  created_at timestamptz not null default now()
);

insert into global_banner (id, enabled, title, message)
values (1, false, 'High Priority Update', '')
on conflict (id) do nothing;

alter table sports enable row level security;
alter table global_banner enable row level security;
alter table audit_log enable row level security;

create policy "public can read sports"
on sports for select
to anon, authenticated
using (true);

create policy "authenticated can modify sports"
on sports for all
to authenticated
using (true)
with check (true);

create policy "public can read banner"
on global_banner for select
to anon, authenticated
using (true);

create policy "authenticated can modify banner"
on global_banner for all
to authenticated
using (true)
with check (true);

create policy "authenticated can read audit log"
on audit_log for select
to authenticated
using (true);

create policy "authenticated can insert audit log"
on audit_log for insert
to authenticated
with check (true);
