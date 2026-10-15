import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/stats")({
  head: () => ({ meta: [{ title: "Player statistics — Demo FC League" }] }),
  component: StatsPage,
});

function StatsPage() {
  const query = useQuery({
    queryKey: ["public-player-stats"],
    queryFn: async () => {
      const { data: tournament, error: tErr } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (tErr) throw tErr;
      if (!tournament) return null;
      const [{ data: teams, error: teamErr }, { data: players, error: playersErr }, { data: matches, error: matchErr }] = await Promise.all([
        supabase.from("teams").select("id,name").eq("tournament_id", tournament.id).lt("slot_index", tournament.team_count),
        supabase.rpc("get_public_players", { _tid: tournament.id }),
        supabase.from("matches").select("id").eq("tournament_id", tournament.id),
      ]);
      if (teamErr) throw teamErr;
      if (playersErr) throw playersErr;
      if (matchErr) throw matchErr;
      const matchIds = (matches ?? []).map(m => m.id);
      let events: Array<{ player_id:string; assist_player_id:string|null; type:string; team_id:string }> = [];
      if (matchIds.length) {
        const { data, error } = await supabase.from("match_events").select("player_id,assist_player_id,type,team_id").in("match_id", matchIds);
        if (error) throw error;
        events = data ?? [];
      }
      const teamName = new Map((teams ?? []).map(team => [team.id, team.name]));
      const playersById = new Map((players ?? []).map(p => [p.id, { ...p, teamName: teamName.get(p.team_id ?? "") ?? "—" }]));
      const goals = new Map<string, number>(), assists = new Map<string, number>(), yellow = new Map<string, number>(), red = new Map<string, number>();
      for (const e of events) {
        if (e.type === "goal" || e.type === "penalty_goal") goals.set(e.player_id, (goals.get(e.player_id) ?? 0)+1);
        if (e.type === "goal" && e.assist_player_id) assists.set(e.assist_player_id, (assists.get(e.assist_player_id) ?? 0)+1);
        if (e.type === "yellow_card") yellow.set(e.player_id, (yellow.get(e.player_id) ?? 0)+1);
        if (e.type === "red_card") red.set(e.player_id, (red.get(e.player_id) ?? 0)+1);
      }
      const rank = (map: Map<string,number>) => [...map.entries()].map(([id,count])=>({player:playersById.get(id),count})).filter(x=>x.player).sort((a,b)=>b.count-a.count || a.player!.full_name.localeCompare(b.player!.full_name));
      return { tournament, scorers:rank(goals), playmakers:rank(assists), yellows:rank(yellow), reds:rank(red) };
    },
    refetchInterval: 15000,
  });
  function ranking(title:string, rows:Array<{player:{id:string;full_name:string;teamName:string}|undefined;count:number}>, suffix:string) {
    return <section className="rounded-xl border bg-card p-5"><h2 className="font-display text-2xl font-bold uppercase">{title}</h2>{rows.length ? <ol className="mt-4 space-y-3">{rows.slice(0,10).map((row,i)=><li key={row.player!.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0"><div className="min-w-0"><p className="font-semibold">{i+1}. {row.player!.full_name}</p><p className="text-xs text-muted-foreground">{row.player!.teamName}</p></div><span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-bold">{row.count} {suffix}</span></li>)}</ol> : <p className="mt-4 text-sm text-muted-foreground">No stats recorded yet.</p>}</section>;
  }
  return <div className="min-h-screen"><SiteHeader name={query.data?.tournament?.name}/><main className="mx-auto max-w-6xl px-4 py-8"><p className="text-sm font-semibold uppercase tracking-wide text-primary">Individual honours</p><h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Player statistics</h1><p className="mt-2 text-sm text-muted-foreground">Goals, assists and disciplinary records from match events. Own goals are not counted as player goals.</p>{query.isLoading?<p className="mt-8 text-sm text-muted-foreground">Loading statistics…</p>:query.error?<p role="alert" className="mt-8 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{(query.error as Error).message}</p>:!query.data?<p className="mt-8 rounded-md bg-muted p-4">No active tournament found.</p>:<div className="mt-6 grid gap-4 md:grid-cols-2">{ranking("Top scorers",query.data.scorers,"goals")}{ranking("Top assists",query.data.playmakers,"assists")}{ranking("Yellow cards",query.data.yellows,"cards")}{ranking("Red cards",query.data.reds,"cards")}</div>}<div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link to="/table">League table →</Link><Link to="/fixtures">Fixtures & results →</Link></div></main></div>;
}
