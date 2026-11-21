-- LearnPath AI: جدول مسیرهای یادگیری (learning_paths)
-- اجرا: Supabase → SQL Editor → New query → این فایل را paste کنید → Run
-- چند بار اجرا کردنش بی‌خطر است.

create table if not exists public.learning_paths (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now()
);

alter table public.learning_paths
    add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

alter table public.learning_paths add column if not exists goal_id text;
alter table public.learning_paths add column if not exists title text;
alter table public.learning_paths add column if not exists plan jsonb;

-- هر کاربر فقط مسیرهای خودش را ببیند و بسازد
alter table public.learning_paths enable row level security;

drop policy if exists "paths_select_own" on public.learning_paths;
drop policy if exists "paths_insert_own" on public.learning_paths;
drop policy if exists "paths_update_own" on public.learning_paths;
drop policy if exists "paths_delete_own" on public.learning_paths;

create policy "paths_select_own" on public.learning_paths
    for select to authenticated using (auth.uid() = user_id);

create policy "paths_insert_own" on public.learning_paths
    for insert to authenticated with check (auth.uid() = user_id);

create policy "paths_update_own" on public.learning_paths
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "paths_delete_own" on public.learning_paths
    for delete to authenticated using (auth.uid() = user_id);

-- اگر موقع ساخت مسیر خطای NOT NULL گرفتید، خروجی این query را بفرستید:
-- select column_name, data_type, is_nullable, column_default
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'learning_paths';

-- ثبت پیشرفت کاربر در هر مسیر (تیک موضوع‌ها)
alter table public.learning_paths
    add column if not exists created_at timestamptz not null default now();

alter table public.learning_paths
    add column if not exists progress jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';

-- آزمون‌های هفتگی: سؤال‌ها (برای ساخته‌نشدن دوباره)، پاسخ‌ها و نمره
create table if not exists public.quiz_results (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
    path_id uuid not null references public.learning_paths(id) on delete cascade,
    week_index integer not null,
    questions jsonb not null,
    answers jsonb,
    score integer,
    created_at timestamptz not null default now(),
    completed_at timestamptz,
    unique (path_id, week_index)
);

alter table public.quiz_results enable row level security;

drop policy if exists "quiz_select_own" on public.quiz_results;
drop policy if exists "quiz_insert_own" on public.quiz_results;
drop policy if exists "quiz_update_own" on public.quiz_results;
drop policy if exists "quiz_delete_own" on public.quiz_results;

create policy "quiz_select_own" on public.quiz_results
    for select to authenticated using (auth.uid() = user_id);

create policy "quiz_insert_own" on public.quiz_results
    for insert to authenticated with check (auth.uid() = user_id);

create policy "quiz_update_own" on public.quiz_results
    for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "quiz_delete_own" on public.quiz_results
    for delete to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';

-- پروفایل: عکس کاربر (به‌صورت متن فشرده ذخیره می‌شود) و اجازه ویرایش نام و عکس
alter table public.profiles add column if not exists avatar_url text;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
    for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
    for insert to authenticated with check (auth.uid() = id);

-- حذف هدف توسط صاحبش
drop policy if exists "goals_delete_own" on public.learning_goals;
create policy "goals_delete_own" on public.learning_goals
    for delete to authenticated using (auth.uid() = user_id);

notify pgrst, 'reload schema';
