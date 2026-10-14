drop index if exists public.matches_pair_unique;
create unique index matches_leg_unique on public.matches (tournament_id, home_team_id, away_team_id);

create or replace function public.generate_fixtures(_tid uuid, _force boolean)
returns int language plpgsql security definer set search_path = public as $$
declare t public.tournaments; ids uuid[]; n int; half int; r int; i int; a uuid; b uuid; tmp uuid[]; cnt int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into t from public.tournaments where id=_tid for update;
  if t.id is null then raise exception 'NOT_FOUND' using errcode='P0001'; end if;
  if exists (select 1 from public.matches m where m.tournament_id=_tid and (m.status='completed' or m.home_score is not null
     or exists (select 1 from public.match_events e where e.match_id=m.id))) then
    raise exception 'RESULTS_EXIST' using errcode='P0001'; end if;
  select count(*) into cnt from public.matches where tournament_id=_tid;
  if cnt > 0 and not _force then raise exception 'FIXTURES_EXIST' using errcode='P0001'; end if;
  delete from public.matches where tournament_id=_tid;
  select array_agg(id order by slot_index) into ids from public.teams where tournament_id=_tid and slot_index < t.team_count;
  if coalesce(array_length(ids,1),0) < 2 then raise exception 'NOT_ENOUGH_TEAMS' using errcode='P0001'; end if;
  if array_length(ids,1) % 2 = 1 then ids := ids || null::uuid; end if; -- bye slot
  n := array_length(ids,1); half := n/2;
  for r in 1..n-1 loop
    for i in 1..half loop
      a := ids[i]; b := ids[n+1-i];
      if a is not null and b is not null then
        if (i = 1 and r % 2 = 0) or (i > 1 and i % 2 = 0) then tmp := array[b,a]; else tmp := array[a,b]; end if;
        insert into public.matches(tournament_id, round, home_team_id, away_team_id) values (_tid, r, tmp[1], tmp[2]);
        insert into public.matches(tournament_id, round, home_team_id, away_team_id) values (_tid, r + n - 1, tmp[2], tmp[1]);
      end if;
    end loop;
    -- rotate all but first
    ids := array[ids[1]] || array[ids[n]] || ids[2:n-1];
  end loop;
  select count(*) into cnt from public.matches where tournament_id=_tid;
  perform public.log_audit(_tid, case when _force then 'fixtures_regenerated' else 'fixtures_generated' end, 'tournament', _tid::text, jsonb_build_object('matches', cnt, 'format', 'double_round_robin'));
  return cnt;
end $$;
revoke execute on function public.generate_fixtures(uuid, boolean) from public, anon;
grant execute on function public.generate_fixtures(uuid, boolean) to authenticated, service_role;
revoke execute on function public.replace_fixtures(uuid, jsonb, boolean) from authenticated;