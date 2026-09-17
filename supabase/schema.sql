-- Elder Care+ authentication support
-- Run this entire file in Supabase Dashboard > SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  username text not null unique check (char_length(username) between 3 and 30),
  full_name text not null default '',
  role text not null default 'Caregiver',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Every new Supabase Auth account gets a matching user profile automatically.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- This enables the assignment's username-or-email login field. It returns only
-- the matching address so Supabase Auth still performs password verification.
-- For a production healthcare system, use a server/Edge Function instead to
-- avoid exposing whether a username is registered.
create or replace function public.resolve_login_email(p_login text)
returns text
language sql
stable
security definer set search_path = public
as $$
  select email
  from public.profiles
  where lower(email) = lower(trim(p_login))
     or lower(username) = lower(trim(p_login))
  limit 1;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
