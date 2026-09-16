-- ============================================================
-- Dev Luminary — Supabase schema
--
-- HOW TO USE:
-- 1. Open your project at https://supabase.com/dashboard
-- 2. Go to SQL Editor → New query
-- 3. Paste this entire file and click "Run"
-- It is safe to re-run this file (uses IF NOT EXISTS / OR REPLACE / DROP..CREATE).
-- ============================================================

-- ------------------------------------------------------------
-- 1. profiles table
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_url   text,
  bio          text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- fast case-insensitive username lookups (used by the availability check + sign in UI)
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

-- ------------------------------------------------------------
-- 2. updated_at auto-touch trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 3. automatic profile creation on signup
--    Runs as SECURITY DEFINER so it can write to public.profiles
--    regardless of the new user's own RLS permissions. This is the
--    server-side trigger the frontend cannot bypass or fake.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
  final_username    text;
begin
  desired_username := lower(coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    split_part(new.email, '@', 1)
  ));
  final_username := desired_username;

  begin
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      final_username,
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), desired_username)
    );
  exception when unique_violation then
    -- extremely rare race condition (two signups picked the same username
    -- at the same instant, after the frontend availability check passed) —
    -- fall back to a guaranteed-unique username rather than failing signup.
    final_username := desired_username || '_' || substr(new.id::text, 1, 6);
    insert into public.profiles (id, username, display_name)
    values (
      new.id,
      final_username,
      coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), desired_username)
    );
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 4. username availability check
--    A safe public RPC used by the sign-up form to give a friendly
--    "username taken" message BEFORE creating the account. It only
--    ever returns true/false — it never exposes any profile data.
-- ------------------------------------------------------------
create or replace function public.is_username_available(check_username text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(check_username)
  );
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

-- ------------------------------------------------------------
-- 5. Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- No DELETE policy is defined on purpose: users should not be able to
-- delete their profile row directly. If a user's auth account is ever
-- deleted, "on delete cascade" above removes their profile automatically.

-- ============================================================
-- Done. Next steps (see chat message for full details):
--   1. Authentication → Providers → make sure "Email" is enabled.
--   2. Authentication → URL Configuration → set your GitHub Pages
--      URL as the Site URL and add it (plus /reset-password.html)
--      to Redirect URLs.
--   3. Copy your Project URL + anon/public key into js/supabase-config.js
-- ============================================================
