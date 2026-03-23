-- ============================================================
-- Calorie Tracker — Phase 2: Database Schema & RLS Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ─────────────────────────────────────────────
-- 1.  GOALS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.goals (
    id              bigint generated always as identity primary key,
    user_id         uuid references auth.users (id) on delete cascade not null,
    target_date     date not null default current_date,
    target_calories integer,
    target_protein  numeric,
    target_carbs    numeric,
    target_fats     numeric,
    created_at      timestamptz default now(),
    unique (user_id, target_date)
);

comment on table public.goals is 'Daily macro/calorie targets per user';

-- ─────────────────────────────────────────────
-- 2.  MEALS TABLE — add user_id if missing
--     (runs idempotently; skips if column exists)
-- ─────────────────────────────────────────────
do $$
begin
    if not exists (
        select 1 from information_schema.columns
        where  table_schema = 'public'
        and    table_name   = 'meals'
        and    column_name  = 'user_id'
    ) then
        alter table public.meals add column user_id uuid references auth.users (id) on delete cascade;
    end if;
end
$$;

-- Ensure meals.user_id is NOT NULL for existing rows (backfill from auth if needed,
-- or set to a placeholder — adjust the backfill subquery to match your auth setup)
update public.meals set user_id = auth.uid() where user_id is null;

alter table public.meals
    alter column user_id set not null;

-- ─────────────────────────────────────────────
-- 3.  INDEXES for RLS performance
-- ─────────────────────────────────────────────
create index if not exists meals_user_id_idx on public.meals (user_id);
create index if not exists goals_user_id_idx  on public.goals  (user_id);

-- ─────────────────────────────────────────────
-- 4.  ENABLE RLS on both tables
-- ─────────────────────────────────────────────
alter table public.meals enable row level security;
alter table public.goals enable row level security;

-- ─────────────────────────────────────────────
-- 5.  MEALS RLS POLICIES
-- ─────────────────────────────────────────────

-- Allow authenticated user to read only their own meals
create policy "meals_select_own"
    on public.meals for select
    using (auth.uid() = user_id);

-- Allow authenticated user to insert only their own meals
create policy "meals_insert_own"
    on public.meals for insert
    with check (auth.uid() = user_id);

-- Allow authenticated user to update only their own meals
create policy "meals_update_own"
    on public.meals for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Allow authenticated user to delete only their own meals
create policy "meals_delete_own"
    on public.meals for delete
    using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 6.  GOALS RLS POLICIES
-- ─────────────────────────────────────────────

create policy "goals_select_own"
    on public.goals for select
    using (auth.uid() = user_id);

create policy "goals_insert_own"
    on public.goals for insert
    with check (auth.uid() = user_id);

create policy "goals_update_own"
    on public.goals for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "goals_delete_own"
    on public.goals for delete
    using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- 7.  STORAGE BUCKET — meal_photos
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public)
    values ('meal_photos', 'meal_photos', false)
on conflict (id) do nothing;

-- ─────────────────────────────────────────────
-- 8.  STORAGE RLS POLICIES
--     Only the bucket owner (auth.uid()) can
--     read/write files they own.  Files are
--     stored under /user_id/filename so the
--     using-check pattern stays simple.
-- ─────────────────────────────────────────────

-- Allow owner to read their own photos
create policy "meal_photos_select_own"
    on storage.objects for select
    using (
        bucket_id = 'meal_photos'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow owner to upload photos
create policy "meal_photos_insert_own"
    on storage.objects for insert
    with check (
        bucket_id = 'meal_photos'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow owner to update their own photos
create policy "meal_photos_update_own"
    on storage.objects for update
    using (
        bucket_id = 'meal_photos'
        and auth.uid()::text = (storage.foldername(name))[1]
    )
    with check (
        bucket_id = 'meal_photos'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- Allow owner to delete their own photos
create policy "meal_photos_delete_own"
    on storage.objects for delete
    using (
        bucket_id = 'meal_photos'
        and auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================
-- Done.  Next steps for your Telegram Mini App frontend:
--   • Authenticate via Supabase anonymous auth (or wire up
--     Telegram initData validation to mint a custom JWT).
--   • Store the returned auth.uid() (UUID) as your user_id
--     when inserting meals / goals.
--   • Upload photos to:  meal_photos/<user_id>/<filename.jpg>
-- ============================================================
