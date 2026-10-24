-- JalanJer! reports: traffic jams, police, accidents, hazards, road closures.
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run.
--
-- Rules:
-- * Anyone (signed in or not) can see active reports, but never who made them.
-- * Only signed-in users can report: at most 10 per hour each.
-- * The server decides when a report expires (the app can't make one last longer).
-- * "Still there?" votes go through vote_report(): one vote per person per report.
--   "Yes" extends the report; 2 "No" votes hide it.

create table if not exists public.reports (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  kind        text        not null check (kind in ('traffic', 'police', 'accident', 'hazard', 'closure')),
  lng         double precision not null check (lng between -180 and 180),
  lat         double precision not null check (lat between -90 and 90),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now(),
  still_there integer     not null default 0,
  not_there   integer     not null default 0
);

create index if not exists reports_active_idx on public.reports (expires_at, lat, lng);

create table if not exists public.report_votes (
  report_id   uuid        not null references public.reports (id) on delete cascade,
  user_id     uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  still_there boolean     not null,
  voted_at    timestamptz not null default now(),
  primary key (report_id, user_id)
);

-- How long each kind of report lasts (minutes). Starting values, tune later.
create or replace function public.report_lifetime(kind text) returns interval
language sql immutable as $$
  select case kind
    when 'traffic'  then interval '30 minutes'
    when 'police'   then interval '60 minutes'
    when 'accident' then interval '90 minutes'
    when 'hazard'   then interval '120 minutes'
    when 'closure'  then interval '6 hours'
    else interval '30 minutes'
  end
$$;

-- Server fills in who, when and until when; enforces the hourly limit.
create or replace function public.reports_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in to report';
  end if;
  if (select count(*) from public.reports
      where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many reports. Try again later.';
  end if;
  new.user_id     := auth.uid();
  new.created_at  := now();
  new.expires_at  := now() + public.report_lifetime(new.kind);
  new.still_there := 0;
  new.not_there   := 0;
  return new;
end
$$;

drop trigger if exists reports_before_insert on public.reports;
create trigger reports_before_insert before insert on public.reports
  for each row execute function public.reports_before_insert();

alter table public.reports enable row level security;
alter table public.report_votes enable row level security;

drop policy if exists "reports: read active" on public.reports;
create policy "reports: read active" on public.reports
  for select to anon, authenticated
  using (expires_at > now() and not_there < 2);

drop policy if exists "reports: insert own" on public.reports;
create policy "reports: insert own" on public.reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Column-level access: user_id is never readable by the app; only kind and position
-- can be sent when reporting (the trigger sets the rest).
revoke all on public.reports from anon, authenticated;
grant select (id, kind, lng, lat, created_at, expires_at, still_there, not_there) on public.reports to anon, authenticated;
grant insert (kind, lng, lat) on public.reports to authenticated;
-- report_votes: no direct access at all; only through vote_report().
revoke all on public.report_votes from anon, authenticated;

create or replace function public.vote_report(p_report uuid, p_still_there boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  inserted integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to vote';
  end if;
  insert into public.report_votes (report_id, user_id, still_there)
  values (p_report, auth.uid(), p_still_there)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then
    return; -- already voted
  end if;
  if p_still_there then
    update public.reports
      set still_there = still_there + 1,
          expires_at  = greatest(expires_at, now() + interval '30 minutes')
      where id = p_report;
  else
    update public.reports set not_there = not_there + 1 where id = p_report;
  end if;
end
$$;

revoke all on function public.vote_report(uuid, boolean) from public, anon;
grant execute on function public.vote_report(uuid, boolean) to authenticated;
