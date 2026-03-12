-- Core role system
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Profiles table (separate from roles)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- News checks / analysis history
create table public.news_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_type text not null check (input_type in ('text', 'url')),
  input_text text,
  source_url text,
  predicted_label text not null check (predicted_label in ('real', 'fake', 'misleading')),
  confidence numeric(5,2) not null check (confidence >= 0 and confidence <= 100),
  explanation text,
  model_name text not null default 'hybrid-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint news_checks_input_required check (
    (input_type = 'text' and input_text is not null and length(trim(input_text)) > 0)
    or
    (input_type = 'url' and source_url is not null and length(trim(source_url)) > 0)
  )
);

create index idx_news_checks_user_created_at on public.news_checks(user_id, created_at desc);

alter table public.news_checks enable row level security;

-- Timestamp helper
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();

create trigger update_news_checks_updated_at
before update on public.news_checks
for each row
execute function public.update_updated_at_column();

-- Auto-create profile on signup
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user_profile();

-- RLS policies: profiles
create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- RLS policies: user_roles
create policy "Users can view own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Admins can manage user roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- RLS policies: news_checks
create policy "Users can view own checks"
on public.news_checks
for select
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can insert own checks"
on public.news_checks
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own checks"
on public.news_checks
for update
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'))
with check (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

create policy "Users can delete own checks"
on public.news_checks
for delete
to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

-- Secure dashboard view
create or replace view public.news_checks_dashboard
with (security_invoker = true)
as
select
  nc.id,
  nc.user_id,
  nc.input_type,
  nc.predicted_label,
  nc.confidence,
  nc.model_name,
  nc.created_at
from public.news_checks nc;