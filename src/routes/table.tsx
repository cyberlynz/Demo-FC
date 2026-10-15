import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/table")({
  head: () => ({ meta: [{ title: "League table — Demo FC League" }] }),
  component: TablePage,
});

type Row = { id: string; name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number };
function TablePage() {
  const query = useQuery({
    queryKey: ["public-league-table"],
    queryFn: async () => {
      const { data: tournament, error: tErr } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (tErr) throw tErr;
      if (!tournament) return null;
      const [{ data: teams, error: teamErr }, { data: matches, error: matchErr }] = await Promise.all([
        supabase.from("teams").select("id,name,slot_index").eq("tournament_id", tournament.id).lt("slot_index", tournament.team_count).order("slot_index"),
        supabase.from("matches").select("*").eq("tournament_id", tournament.id).eq("status", "completed"),
      ]);
      if (teamErr) throw teamErr;
      if (matchErr) throw matchErr;
      const rows = new Map<string, Row>((teams ?? []).map(team => [team.id, { id: team.id, name: team.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }]));
      for (const match of matches ?? []) {
        if (match.home_score == null || match.away_score == null) continue;
        const home = rows.get(match.home_team_id), away = rows.get(match.away_team_id);
        if (!home || !away) continue;
        home.played++; away.played++;
        home.gf += match.home_score; home.ga += match.away_score;
        away.gf += match.away_score; away.ga += match.home_score;
        if (match.home_score > match.away_score) { home.won++; home.points += 3; away.lost++; }
        else if (match.home_score < match.away_score) { away.won++; away.points += 3; home.lost++; }
        else { home.drawn++; away.drawn++; home.points++; away.points++; }
      }
      return { tournament, rows: [...rows.values()].sort((a,b) => b.points-a.points || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || a.name.localeCompare(b.name)) };
    },
    refetchInterval: 15000,
  });
  return (
    <div className="min-h-screen">
      <SiteHeader name={query.data?.tournament?.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Season standings</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase">League table</h1>
        <p className="mt-2 text-sm text-muted-foreground">Only completed matches count. Win = 3 points, draw = 1 point.</p>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Calculating standings…</p> : query.error ? <p role="alert" className="mt-8 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{(query.error as Error).message}</p> : !query.data ? <p className="mt-8 rounded-md bg-muted p-4">No active tournament found.</p> : (
          <>
            <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
              <table className="w-full min-w-[620px] border-collapse text-sm">
                <thead className="bg-muted text-left"><tr>{["Pos","Team","P","W","D","L","GF","GA","GD","Pts"].map(col=><th key={col} className="px-3 py-3 font-semibold">{col}</th>)}</tr></thead>
                <tbody>{query.data.rows.map((row,index)=><tr key={row.id} className="border-t"><td className="px-3 py-3 font-semibold">{index+1}</td><td className="px-3 py-3 font-semibold">{row.name}</td><td className="px-3 py-3">{row.played}</td><td className="px-3 py-3">{row.won}</td><td className="px-3 py-3">{row.drawn}</td><td className="px-3 py-3">{row.lost}</td><td className="px-3 py-3">{row.gf}</td><td className="px-3 py-3">{row.ga}</td><td className="px-3 py-3">{row.gf-row.ga}</td><td className="px-3 py-3 font-bold">{row.points}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link to="/fixtures">Fixtures & results →</Link><Link to="/teams">Teams & rosters →</Link><Link to="/stats">Player stats →</Link></div>
          </>
        )}
      </main>
    </div>
  );
}
