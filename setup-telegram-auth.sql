-- ============================================================
-- Calorie Tracker — Phase 3: Telegram Auth Migration
-- Run this in your Supabase SQL Editor after Phase 2 setup
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. PROFILES TABLE
-- ─────────────────────────────────────────────
-- Stores Telegram user mappings (links telegram_id to auth.users UUID)
create table if not exists public.profiles (
    id                    uuid primary key default gen_random_uuid(),
    telegram_id           text unique not null,
    telegram_username     text,
    telegram_first_name   text,
    telegram_last_name    text,
    created_at            timestamptz default now(),
    updated_at            timestamptz default now()
);

comment on table public.profiles is 'Telegram user profile mappings';

-- ─────────────────────────────────────────────
-- 2. INDEX for fast telegram_id lookups
-- ─────────────────────────────────────────────
create index if not exists profiles_telegram_id_idx on public.profiles (telegram_id);

-- ─────────────────────────────────────────────
-- 3. ENABLE RLS
-- ─────────────────────────────────────────────
alter table public.profiles enable row level security;

-- ─────────────────────────────────────────────
-- 4. RLS POLICIES
-- ─────────────────────────────────────────────

-- Users can view their own profile
create policy "profiles_select_own"
    on public.profiles for select
    using (auth.uid() = id);

-- Only the system (service role) can insert profiles
-- (this is done via the Edge Function, not directly)
create policy "profiles_insert_system"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- 5. FUNCTION: auto-create profile on user signup
--     (Optional: if you want to link auth.users to Telegram)
-- ─────────────────────────────────────────────
-- Note: For Telegram auth, we don't use auth.users directly.
-- Instead, the Edge Function creates a profile and returns a
-- custom JWT with the profile.id as the subject.
-- 
-- If you later add email/password auth, you can use this trigger:
--
-- create or replace function public.handle_new_user()
-- returns trigger as $$
-- begin
--     insert into public.profiles (id)
--     values (new.id);
--     return new;
-- end;
-- $$ language plpgsql security definer;
--
-- create trigger on_auth_user_created
--     after insert on auth.users
--     for each row execute procedure public.handle_new_user();

-- ============================================================
-- Done! Now deploy the Edge Function:
--   supabase functions deploy telegram-auth
--   
-- And set the secrets:
--   supabase secrets set TELEGRAM_BOT_TOKEN=your_bot_token
--   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
--   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
-- ============================================================
