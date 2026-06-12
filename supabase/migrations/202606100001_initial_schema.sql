create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  title text not null,
  headline text not null,
  intro text not null,
  contact jsonb not null default '{}'::jsonb,
  resume_snapshot jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null,
  tags text[] not null default '{}',
  demo_url text not null,
  cover_image_url text,
  contribution text not null default '',
  ai_usage text not null default '',
  decisions text not null default '',
  reflection text not null default '',
  prd_markdown text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  is_featured boolean not null default false,
  sort_order integer not null default 100,
  analytics_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role text not null,
  jd_url text,
  jd_summary text,
  tags text[] not null default '{}',
  channel text not null default 'manual',
  notes text,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  referrer text,
  ip_address inet,
  geo_country text,
  geo_region text,
  geo_city text,
  source_hint text,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  visitor_id uuid not null references public.visitors(id) on delete cascade,
  campaign_id uuid references public.campaigns(id) on delete set null,
  event_type text not null,
  project_id uuid references public.projects(id) on delete set null,
  path text not null,
  target_url text,
  section_id text,
  duration_ms integer,
  scroll_depth numeric,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists idx_projects_public_sort on public.projects(status, is_featured, sort_order);
create index if not exists idx_projects_published_sort on public.projects(sort_order) where status = 'published';
create index if not exists idx_campaigns_slug on public.campaigns(slug);
create index if not exists idx_sessions_campaign_started on public.sessions(campaign_id, started_at desc);
create index if not exists idx_sessions_started_at on public.sessions(started_at desc);
create index if not exists idx_events_session_time on public.events(session_id, occurred_at);
create index if not exists idx_events_project_type on public.events(project_id, event_type);
create index if not exists idx_events_campaign_type on public.events(campaign_id, event_type);
create index if not exists idx_events_occurred_at on public.events(occurred_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.campaigns enable row level security;
alter table public.visitors enable row level security;
alter table public.sessions enable row level security;
alter table public.events enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on table public.profiles to anon, authenticated;
grant select on table public.projects to anon, authenticated;
grant select, insert, update, delete on table
  public.profiles,
  public.projects,
  public.campaigns,
  public.visitors,
  public.sessions,
  public.events
to service_role;

drop policy if exists "Profiles are publicly readable" on public.profiles;
create policy "Profiles are publicly readable"
on public.profiles for select
to anon, authenticated
using (true);

drop policy if exists "Published projects are publicly readable" on public.projects;
create policy "Published projects are publicly readable"
on public.projects for select
to anon, authenticated
using (status = 'published');

insert into storage.buckets (id, name, public)
values ('project-covers', 'project-covers', true)
on conflict (id) do nothing;

drop policy if exists "Project covers are publicly readable" on storage.objects;
create policy "Project covers are publicly readable"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'project-covers');
