create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and public.has_role(auth.uid(), 'admin')
$$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  season text not null check (char_length(season) between 1 and 20),
  fee integer not null default 5000 check (fee >= 0 and fee <= 10000000),
  donation_message text not null default '' check (char_length(donation_message) <= 2000),
  bank_name text not null default '' check (char_length(bank_name) <= 100),
  account_name text not null default '' check (char_length(account_name) <= 100),
  account_number text not null default '' check (account_number ~ '^[0-9]{0,20}$'),
  registration_open boolean not null default true,
  team_count integer not null default 4 check (team_count between 2 and 32),
  players_per_team integer not null default 7 check (players_per_team between 1 and 40),
  is_current boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index tournaments_one_current on public.tournaments (is_current) where is_current;
grant select on public.tournaments to anon, authenticated;
grant all on public.tournaments to service_role;
alter table public.tournaments enable row level security;
create policy "tournaments public read" on public.tournaments for select to anon, authenticated using (true);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  slot_index integer not null check (slot_index >= 0),
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now(),
  unique (tournament_id, slot_index),
  unique (tournament_id, name)
);
create index teams_tournament_idx on public.teams(tournament_id);
grant select on public.teams to anon, authenticated;
grant all on public.teams to service_role;
alter table public.teams enable row level security;
create policy "teams public read" on public.teams for select to anon, authenticated using (true);

create type public.registration_status as enum ('pending','approved','rejected');
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  code text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 100),
  phone text not null check (phone ~ '^234[789][01][0-9]{8}$'),
  email text check (email is null or (char_length(email) <= 255 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  preferred_position text check (preferred_position is null or char_length(preferred_position) <= 30),
  payment_reference text check (payment_reference is null or char_length(payment_reference) between 1 and 100),
  status public.registration_status not null default 'pending',
  team_id uuid references public.teams(id) on delete restrict,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint approved_has_team check ((status = 'approved') = (team_id is not null))
);
create unique index registrations_active_phone on public.registrations (tournament_id, phone) where status <> 'rejected';
create unique index registrations_payment_ref on public.registrations (tournament_id, lower(payment_reference)) where payment_reference is not null and status <> 'rejected';
create index registrations_status_idx on public.registrations (tournament_id, status, created_at desc);
create index registrations_team_idx on public.registrations (team_id) where team_id is not null;
grant select on public.registrations to authenticated;
grant all on public.registrations to service_role;
alter table public.registrations enable row level security;
create policy "registrations admin read" on public.registrations for select to authenticated using (public.is_admin());

create type public.match_status as enum ('scheduled','completed','postponed','cancelled');
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round integer not null check (round >= 1),
  home_team_id uuid not null references public.teams(id) on delete restrict,
  away_team_id uuid not null references public.teams(id) on delete restrict,
  match_date timestamptz,
  venue text check (venue is null or char_length(venue) <= 100),
  status public.match_status not null default 'scheduled',
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  created_at timestamptz not null default now(),
  check (home_team_id <> away_team_id),
  constraint completed_has_score check (status <> 'completed' or (home_score is not null and away_score is not null))
);
create unique index matches_pair_unique on public.matches (tournament_id, least(home_team_id, away_team_id), greatest(home_team_id, away_team_id));
create index matches_tournament_idx on public.matches (tournament_id, round);
grant select on public.matches to anon, authenticated;
grant all on public.matches to service_role;
alter table public.matches enable row level security;
create policy "matches public read" on public.matches for select to anon, authenticated using (true);

create type public.event_type as enum ('goal','penalty_goal','own_goal','yellow_card','red_card');
create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  type public.event_type not null,
  player_id uuid not null references public.registrations(id) on delete restrict,
  assist_player_id uuid references public.registrations(id) on delete restrict,
  team_id uuid not null references public.teams(id) on delete restrict,
  minute integer check (minute is null or minute between 0 and 150),
  created_at timestamptz not null default now(),
  check (assist_player_id is null or assist_player_id <> player_id)
);
comment on column public.match_events.team_id is 'Team credited: for goals the scoring team (own goal = opponent of the player''s team); for cards the player''s team';
create index match_events_match_idx on public.match_events(match_id);
create index match_events_player_idx on public.match_events(player_id);
grant select on public.match_events to anon, authenticated;
grant delete on public.match_events to authenticated;
grant all on public.match_events to service_role;
alter table public.match_events enable row level security;
create policy "events public read" on public.match_events for select to anon, authenticated using (true);
create policy "events admin delete" on public.match_events for delete to authenticated using (public.is_admin());

create type public.donation_status as enum ('pending','confirmed','rejected');
create table public.donations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  donor_name text check (donor_name is null or char_length(donor_name) <= 100),
  amount integer not null check (amount > 0 and amount <= 100000000),
  message text check (message is null or char_length(message) <= 500),
  transfer_reference text check (transfer_reference is null or char_length(transfer_reference) <= 100),
  show_name boolean not null default true,
  status public.donation_status not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index donations_status_idx on public.donations (tournament_id, status, created_at desc);
grant select on public.donations to authenticated;
grant all on public.donations to service_role;
alter table public.donations enable row level security;
create policy "donations admin read" on public.donations for select to authenticated using (public.is_admin());

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tournament_id uuid references public.tournaments(id) on delete set null,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "audit admin read" on public.audit_logs for select to authenticated using (public.is_admin());

create table public.rate_limits (
  id bigint generated always as identity primary key,
  bucket text not null,
  key text not null,
  created_at timestamptz not null default now()
);
create index rate_limits_lookup on public.rate_limits (bucket, key, created_at desc);
grant all on public.rate_limits to service_role;
alter table public.rate_limits enable row level security;

create or replace function public.log_audit(_tid uuid, _action text, _entity text, _entity_id text, _details jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (tournament_id, actor_id, action, entity, entity_id, details)
  values (_tid, auth.uid(), _action, _entity, _entity_id, coalesce(_details,'{}'::jsonb));
$$;

create or replace function public.get_public_players(_tid uuid)
returns table (id uuid, team_id uuid, full_name text, preferred_position text)
language sql stable security definer set search_path = public as $$
  select r.id, r.team_id, r.full_name, r.preferred_position from public.registrations r
  where r.tournament_id = _tid and r.status = 'approved' order by r.full_name
$$;

create or replace function public.get_registration_counts(_tid uuid)
returns table (pending bigint, approved bigint)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where status='pending'), count(*) filter (where status='approved')
  from public.registrations where tournament_id = _tid
$$;

create or replace function public.get_public_donations(_tid uuid)
returns table (total bigint, donor_count bigint, recent jsonb)
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::bigint, count(*),
    coalesce((select jsonb_agg(x) from (
      select case when d.show_name and d.donor_name is not null then d.donor_name else 'Anonymous' end as name, d.amount
      from public.donations d where d.tournament_id=_tid and d.status='confirmed' order by d.reviewed_at desc nulls last limit 12) x), '[]'::jsonb)
  from public.donations where tournament_id = _tid and status = 'confirmed'
$$;

create or replace function public.check_rate_limit(_bucket text, _key text, _max int, _window_seconds int)
returns boolean language plpgsql security definer set search_path = public as $$
declare c int;
begin
  delete from public.rate_limits where created_at < now() - interval '1 day';
  select count(*) into c from public.rate_limits where bucket=_bucket and key=_key and created_at > now() - make_interval(secs => _window_seconds);
  if c >= _max then return false; end if;
  insert into public.rate_limits(bucket,key) values (_bucket,_key);
  return true;
end $$;

create or replace function public.register_player(_full_name text, _phone text, _email text, _position text, _payment_reference text)
returns table (code text, status public.registration_status)
language plpgsql security definer set search_path = public, extensions as $$
declare t public.tournaments; new_code text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  select * into t from public.tournaments where is_current;
  if t.id is null then raise exception 'NO_TOURNAMENT' using errcode='P0001'; end if;
  if not t.registration_open then raise exception 'REGISTRATION_CLOSED' using errcode='P0001'; end if;
  if exists (select 1 from public.registrations r where r.tournament_id=t.id and r.phone=_phone and r.status<>'rejected') then
    raise exception 'DUPLICATE_PHONE' using errcode='P0001'; end if;
  if _payment_reference is not null and exists (select 1 from public.registrations r where r.tournament_id=t.id and lower(r.payment_reference)=lower(_payment_reference) and r.status<>'rejected') then
    raise exception 'DUPLICATE_REFERENCE' using errcode='P0001'; end if;
  loop
    new_code := 'DFC-';
    for i in 1..6 loop new_code := new_code || substr(alphabet, 1 + (get_byte(gen_random_bytes(1),0) % 32), 1); end loop;
    exit when not exists (select 1 from public.registrations r where r.code = new_code);
  end loop;
  begin
    insert into public.registrations(tournament_id, code, full_name, phone, email, preferred_position, payment_reference)
    values (t.id, new_code, _full_name, _phone, _email, _position, _payment_reference);
  exception when unique_violation then
    raise exception 'DUPLICATE_PHONE_OR_REFERENCE' using errcode='P0001';
  end;
  return query select new_code, 'pending'::public.registration_status;
end $$;

create or replace function public.lookup_registration(_code text, _phone text)
returns table (code text, full_name text, status public.registration_status, team_name text, review_note text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select r.code, r.full_name, r.status, tm.name,
    case when r.status='rejected' then r.review_note else null end, r.created_at
  from public.registrations r left join public.teams tm on tm.id = r.team_id
  where r.code = upper(_code) and r.phone = _phone limit 1
$$;

create or replace function public.submit_donation(_donor_name text, _amount int, _message text, _ref text, _show_name boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare tid uuid; nid uuid;
begin
  select id into tid from public.tournaments where is_current;
  if tid is null then raise exception 'NO_TOURNAMENT' using errcode='P0001'; end if;
  insert into public.donations(tournament_id, donor_name, amount, message, transfer_reference, show_name)
  values (tid, _donor_name, _amount, _message, _ref, _show_name) returning id into nid;
  return nid;
end $$;

create or replace function public.claim_first_admin() returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN' using errcode='P0001'; end if;
  lock table public.user_roles in exclusive mode;
  if exists (select 1 from public.user_roles where role='admin') then
    raise exception 'ADMIN_ALREADY_EXISTS' using errcode='P0001'; end if;
  insert into public.user_roles(user_id, role) values (auth.uid(), 'admin');
  perform public.log_audit(null, 'first_admin_claimed', 'user', auth.uid()::text, '{}');
  return true;
end $$;

create or replace function public.admin_exists() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role='admin')
$$;

create or replace function public.approve_registration(_reg_id uuid, _note text default null)
returns table (team_id uuid, team_name text)
language plpgsql security definer set search_path = public as $$
declare r public.registrations; t public.tournaments; chosen uuid; chosen_name text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into r from public.registrations where id = _reg_id;
  if r.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  select * into t from public.tournaments where id = r.tournament_id for update;
  select * into r from public.registrations where id = _reg_id for update;
  if r.status <> 'pending' then raise exception 'NOT_PENDING' using errcode='P0001'; end if;
  select tm.id, tm.name into chosen, chosen_name from public.teams tm
  where tm.tournament_id = t.id and tm.slot_index < t.team_count
    and (select count(*) from public.registrations x where x.team_id = tm.id and x.status='approved') < t.players_per_team
  order by random() limit 1;
  if chosen is null then raise exception 'ALL_TEAMS_FULL' using errcode='P0001'; end if;
  update public.registrations set status='approved', team_id=chosen, review_note=_note, reviewed_by=auth.uid(), reviewed_at=now() where id=r.id;
  perform public.log_audit(t.id, 'registration_approved', 'registration', r.id::text, jsonb_build_object('code', r.code, 'team', chosen_name));
  return query select chosen, chosen_name;
end $$;

create or replace function public.reject_registration(_reg_id uuid, _reason text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.registrations;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if _reason is null or char_length(trim(_reason)) < 3 then raise exception 'REASON_REQUIRED' using errcode='P0001'; end if;
  select * into r from public.registrations where id=_reg_id for update;
  if r.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if r.status <> 'pending' then raise exception 'NOT_PENDING' using errcode='P0001'; end if;
  update public.registrations set status='rejected', review_note=left(trim(_reason),500), reviewed_by=auth.uid(), reviewed_at=now() where id=r.id;
  perform public.log_audit(r.tournament_id, 'registration_rejected', 'registration', r.id::text, jsonb_build_object('code', r.code, 'reason', trim(_reason)));
end $$;

create or replace function public.reassign_player(_reg_id uuid, _team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r public.registrations; t public.tournaments; target public.teams; old_name text; cnt int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into r from public.registrations where id=_reg_id;
  if r.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  select * into t from public.tournaments where id=r.tournament_id for update;
  select * into r from public.registrations where id=_reg_id for update;
  if r.status <> 'approved' then raise exception 'NOT_APPROVED' using errcode='P0001'; end if;
  select * into target from public.teams where id=_team_id and tournament_id=t.id;
  if target.id is null or target.slot_index >= t.team_count then raise exception 'TEAM_NOT_FOUND' using errcode='P0001'; end if;
  if target.id = r.team_id then raise exception 'SAME_TEAM' using errcode='P0001'; end if;
  select count(*) into cnt from public.registrations where team_id=target.id and status='approved';
  if cnt >= t.players_per_team then raise exception 'TEAM_FULL' using errcode='P0001'; end if;
  select name into old_name from public.teams where id=r.team_id;
  update public.registrations set team_id=target.id where id=r.id;
  perform public.log_audit(t.id, 'player_reassigned', 'registration', r.id::text, jsonb_build_object('code', r.code, 'from', old_name, 'to', target.name));
end $$;

create or replace function public.update_tournament_settings(_tid uuid, _s jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare t public.tournaments; new_count int; new_ppt int; maxocc int; i int; conflicts text;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into t from public.tournaments where id=_tid for update;
  if t.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  new_count := coalesce((_s->>'team_count')::int, t.team_count);
  new_ppt := coalesce((_s->>'players_per_team')::int, t.players_per_team);
  select coalesce(max(c),0) into maxocc from (select count(*) c from public.registrations where tournament_id=_tid and status='approved' group by team_id) z;
  if new_ppt < maxocc then raise exception 'CAPACITY_CONFLICT: a team already has % players', maxocc using errcode='P0001'; end if;
  if new_count < t.team_count then
    select string_agg(tm.name, ', ') into conflicts from public.teams tm
    where tm.tournament_id=_tid and tm.slot_index >= new_count
      and (exists (select 1 from public.registrations x where x.team_id=tm.id)
        or exists (select 1 from public.matches m where m.home_team_id=tm.id or m.away_team_id=tm.id));
    if conflicts is not null then raise exception 'TEAM_COUNT_CONFLICT: % have players or fixtures', conflicts using errcode='P0001'; end if;
    delete from public.teams where tournament_id=_tid and slot_index >= new_count;
  end if;
  update public.tournaments set
    name = coalesce(_s->>'name', name), season = coalesce(_s->>'season', season),
    fee = coalesce((_s->>'fee')::int, fee), donation_message = coalesce(_s->>'donation_message', donation_message),
    bank_name = coalesce(_s->>'bank_name', bank_name), account_name = coalesce(_s->>'account_name', account_name),
    account_number = coalesce(_s->>'account_number', account_number),
    registration_open = coalesce((_s->>'registration_open')::boolean, registration_open),
    team_count = new_count, players_per_team = new_ppt, updated_at = now()
  where id=_tid;
  for i in 0..new_count-1 loop
    insert into public.teams(tournament_id, slot_index, name)
    values (_tid, i, 'Team ' || chr(65 + (i % 26)) || case when i >= 26 then (i/26)::text else '' end)
    on conflict do nothing;
    if not exists (select 1 from public.teams where tournament_id=_tid and slot_index=i) then
      insert into public.teams(tournament_id, slot_index, name) values (_tid, i, 'Team ' || (i+1)::text);
    end if;
  end loop;
  perform public.log_audit(_tid, 'settings_updated', 'tournament', _tid::text, _s);
end $$;

create or replace function public.replace_fixtures(_tid uuid, _fixtures jsonb, _force boolean)
returns int language plpgsql security definer set search_path = public as $$
declare t public.tournaments; n int; f jsonb;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into t from public.tournaments where id=_tid for update;
  if exists (select 1 from public.matches m where m.tournament_id=_tid and (m.status='completed' or m.home_score is not null
     or exists (select 1 from public.match_events e where e.match_id=m.id))) then
    raise exception 'RESULTS_EXIST' using errcode='P0001'; end if;
  select count(*) into n from public.matches where tournament_id=_tid;
  if n > 0 and not _force then raise exception 'FIXTURES_EXIST' using errcode='P0001'; end if;
  delete from public.matches where tournament_id=_tid;
  for f in select * from jsonb_array_elements(_fixtures) loop
    if not exists (select 1 from public.teams where id=(f->>'home')::uuid and tournament_id=_tid and slot_index < t.team_count)
       or not exists (select 1 from public.teams where id=(f->>'away')::uuid and tournament_id=_tid and slot_index < t.team_count) then
      raise exception 'INVALID_TEAM_IN_FIXTURES' using errcode='P0001';
    end if;
    insert into public.matches(tournament_id, round, home_team_id, away_team_id)
    values (_tid, (f->>'round')::int, (f->>'home')::uuid, (f->>'away')::uuid);
  end loop;
  select count(*) into n from public.matches where tournament_id=_tid;
  perform public.log_audit(_tid, case when _force then 'fixtures_regenerated' else 'fixtures_generated' end, 'tournament', _tid::text, jsonb_build_object('matches', n));
  return n;
end $$;

create or replace function public.save_match(_match_id uuid, _home int, _away int, _status public.match_status, _date timestamptz, _venue text, _round int)
returns void language plpgsql security definer set search_path = public as $$
declare m public.matches; hg int; ag int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into m from public.matches where id=_match_id for update;
  if m.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if (_home is not null and _home < 0) or (_away is not null and _away < 0) then raise exception 'INVALID_SCORE' using errcode='P0001'; end if;
  if _status='completed' and (_home is null or _away is null) then raise exception 'SCORE_REQUIRED' using errcode='P0001'; end if;
  select count(*) filter (where team_id=m.home_team_id), count(*) filter (where team_id=m.away_team_id) into hg, ag
  from public.match_events where match_id=m.id and type in ('goal','penalty_goal','own_goal');
  if (hg > 0 or ag > 0) and (coalesce(_home,0) < hg or coalesce(_away,0) < ag) then
    raise exception 'SCORE_BELOW_EVENTS: recorded goal events are % - %', hg, ag using errcode='P0001'; end if;
  update public.matches set home_score=_home, away_score=_away, status=_status, match_date=_date, venue=nullif(trim(_venue),''), round=coalesce(_round, round) where id=m.id;
  perform public.log_audit(m.tournament_id, 'match_updated', 'match', m.id::text, jsonb_build_object('home', _home, 'away', _away, 'status', _status));
end $$;

create or replace function public.add_match_event(_match_id uuid, _type public.event_type, _player_id uuid, _assist_id uuid, _minute int)
returns uuid language plpgsql security definer set search_path = public as $$
declare m public.matches; p public.registrations; a public.registrations; credited uuid; cnt int; lim int; nid uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into m from public.matches where id=_match_id for update;
  if m.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  select * into p from public.registrations where id=_player_id and status='approved';
  if p.id is null or p.team_id not in (m.home_team_id, m.away_team_id) then raise exception 'PLAYER_NOT_IN_MATCH' using errcode='P0001'; end if;
  if _type = 'own_goal' then
    credited := case when p.team_id=m.home_team_id then m.away_team_id else m.home_team_id end;
  else credited := p.team_id; end if;
  if _assist_id is not null then
    if _type <> 'goal' then raise exception 'ASSIST_ONLY_FOR_GOALS' using errcode='P0001'; end if;
    select * into a from public.registrations where id=_assist_id and status='approved';
    if a.id is null or a.team_id <> p.team_id then raise exception 'ASSIST_MUST_BE_TEAMMATE' using errcode='P0001'; end if;
  end if;
  if _type in ('goal','penalty_goal','own_goal') then
    if m.home_score is null then raise exception 'ENTER_SCORE_FIRST' using errcode='P0001'; end if;
    select count(*) into cnt from public.match_events where match_id=m.id and team_id=credited and type in ('goal','penalty_goal','own_goal');
    lim := case when credited=m.home_team_id then m.home_score else m.away_score end;
    if cnt + 1 > lim then raise exception 'GOALS_EXCEED_SCORE' using errcode='P0001'; end if;
  end if;
  insert into public.match_events(match_id, type, player_id, assist_player_id, team_id, minute)
  values (m.id, _type, p.id, _assist_id, credited, _minute) returning id into nid;
  perform public.log_audit(m.tournament_id, 'match_event_added', 'match', m.id::text, jsonb_build_object('type', _type, 'player', p.full_name));
  return nid;
end $$;

create or replace function public.review_donation(_id uuid, _status public.donation_status, _show_name boolean)
returns void language plpgsql security definer set search_path = public as $$
declare d public.donations;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into d from public.donations where id=_id for update;
  if d.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.donations set status=_status, show_name=coalesce(_show_name, show_name), reviewed_by=auth.uid(), reviewed_at=now() where id=_id;
  perform public.log_audit(d.tournament_id, 'donation_' || _status::text, 'donation', _id::text, jsonb_build_object('amount', d.amount, 'show_name', coalesce(_show_name, d.show_name)));
end $$;

create or replace function public.rename_team(_team_id uuid, _name text)
returns void language plpgsql security definer set search_path = public as $$
declare tm public.teams;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into tm from public.teams where id=_team_id;
  if tm.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  update public.teams set name=trim(_name) where id=_team_id;
  perform public.log_audit(tm.tournament_id, 'team_renamed', 'team', _team_id::text, jsonb_build_object('from', tm.name, 'to', trim(_name)));
end $$;

create or replace function public.delete_match_event(_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e public.match_events; tid uuid;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into e from public.match_events where id=_id;
  if e.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  select tournament_id into tid from public.matches where id=e.match_id;
  delete from public.match_events where id=_id;
  perform public.log_audit(tid, 'match_event_deleted', 'match', e.match_id::text, jsonb_build_object('type', e.type));
end $$;

-- Lock down execution: revoke everything, then grant explicitly
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.get_public_players(uuid) to anon, authenticated;
grant execute on function public.get_registration_counts(uuid) to anon, authenticated;
grant execute on function public.get_public_donations(uuid) to anon, authenticated;
grant execute on function public.admin_exists() to anon, authenticated;
grant execute on function public.claim_first_admin() to authenticated;
grant execute on function public.approve_registration(uuid, text) to authenticated;
grant execute on function public.reject_registration(uuid, text) to authenticated;
grant execute on function public.reassign_player(uuid, uuid) to authenticated;
grant execute on function public.update_tournament_settings(uuid, jsonb) to authenticated;
grant execute on function public.replace_fixtures(uuid, jsonb, boolean) to authenticated;
grant execute on function public.save_match(uuid,int,int,public.match_status,timestamptz,text,int) to authenticated;
grant execute on function public.add_match_event(uuid,public.event_type,uuid,uuid,int) to authenticated;
grant execute on function public.delete_match_event(uuid) to authenticated;
grant execute on function public.review_donation(uuid, public.donation_status, boolean) to authenticated;
grant execute on function public.rename_team(uuid, text) to authenticated;
grant execute on all functions in schema public to service_role;

insert into public.tournaments (name, season, fee, donation_message, bank_name, account_name, account_number, registration_open, team_count, players_per_team, is_current, is_demo)
values ('Demo FC League', '2026', 5000,
 'Your donation helps cover pitch hire, referees, jerseys, water and medals. Every naira counts — thank you for supporting grassroots football!',
 'GTBank', 'Collins Okike', '0449480930', true, 4, 7, true, true);
insert into public.teams (tournament_id, slot_index, name)
select t.id, s.i, 'Team ' || chr(65+s.i) from public.tournaments t, generate_series(0,3) s(i) where t.is_current;