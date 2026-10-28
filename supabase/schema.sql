-- Run once in Supabase SQL Editor. Create Auth accounts separately.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('teacher', 'student'))
);
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 80),
  category text not null check (category in ('important','academic','activity','general')),
  author text not null,
  audience text not null,
  date timestamptz not null default now(),
  pinned boolean not null default false,
  content text not null
);
alter table public.profiles enable row level security;
alter table public.announcements enable row level security;
revoke all on public.profiles, public.announcements from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "members read announcements" on public.announcements for select to authenticated
using (exists (select 1 from public.profiles where id = auth.uid()));
create policy "teachers insert" on public.announcements for insert to authenticated
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
create policy "teachers update" on public.announcements for update to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'))
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
create policy "teachers delete" on public.announcements for delete to authenticated
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
-- No expiration, scheduled cleanup or browser storage is used.
