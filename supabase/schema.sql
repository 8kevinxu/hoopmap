-- HoopMap SF — crowd check-ins table.
-- Run this in your Supabase project: Dashboard → SQL Editor → New query → paste → Run.

create table if not exists public.check_ins (
  id          bigint generated always as identity primary key,
  court_id    text        not null,
  level       text        not null check (level in ('empty', 'moderate', 'packed')),
  created_at  timestamptz not null default now()
);

-- Fast "recent check-ins per court" lookups.
create index if not exists check_ins_court_time_idx
  on public.check_ins (court_id, created_at desc);

-- Anonymous, public check-ins: anyone can read and add, nobody can edit/delete.
alter table public.check_ins enable row level security;

create policy "anyone can read check-ins"
  on public.check_ins for select using (true);

create policy "anyone can add a check-in"
  on public.check_ins for insert with check (true);

-- Allow removing a recent check-in (powers "tap your vote again to undo").
-- Bounded to the last 2h to limit abuse in the anonymous model.
create policy "anyone can delete a recent check-in"
  on public.check_ins for delete
  using (created_at > now() - interval '2 hours');

-- Enable real-time so other users' check-ins push live to the app.
alter publication supabase_realtime add table public.check_ins;
