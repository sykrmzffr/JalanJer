-- JalanJer! places sync: Home, Work, Saved and Recent places per user.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP ... IF EXISTS).
--
-- Every row belongs to one signed-in user. Row Level Security makes sure a
-- user can only ever see and change their own rows.

create table if not exists public.places (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  -- 'home' | 'work' | 'saved' | 'recent'
  kind       text        not null check (kind in ('home', 'work', 'saved', 'recent')),
  -- 'home' / 'work' for those two; the place id for saved and recent places.
  slot       text        not null check (char_length(slot) between 1 and 200),
  place_id   text        not null check (char_length(place_id) between 1 and 200),
  name       text        not null check (char_length(name) <= 300),
  address    text        not null default '' check (char_length(address) <= 500),
  lng        double precision not null check (lng between -180 and 180),
  lat        double precision not null check (lat between -90 and 90),
  -- Milliseconds since 1970 from the phone that made the change (last change wins).
  changed_at bigint      not null,
  -- Deletions are kept as "tombstones" so other phones learn about them.
  deleted    boolean     not null default false,
  primary key (user_id, kind, slot)
);

alter table public.places enable row level security;

drop policy if exists "places: read own" on public.places;
create policy "places: read own" on public.places
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "places: insert own" on public.places;
create policy "places: insert own" on public.places
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "places: update own" on public.places;
create policy "places: update own" on public.places
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "places: delete own" on public.places;
create policy "places: delete own" on public.places
  for delete to authenticated using (user_id = (select auth.uid()));

-- New tables are not exposed automatically in this project, so grant access
-- explicitly: signed-in users only (RLS above limits them to their own rows).
revoke all on public.places from anon;
grant select, insert, update, delete on public.places to authenticated;
