import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";

export const Route = createFileRoute("/teams")({
  head: () => ({ meta: [{ title: "Teams and rosters — Demo FC League" }] }),
  component: TeamsPage,
});

function TeamsPage() {
  const query = useQuery({
    queryKey: ["public-teams-rosters"],
    queryFn: async () => {
      const { data: tournament, error: tournamentError } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (tournamentError) throw tournamentError;
      if (!tournament) return null;
      const [{ data: teams, error: teamsError }, { data: players, error: playersError }] = await Promise.all([
        supabase.from("teams").select("*").eq("tournament_id", tournament.id).lt("slot_index", tournament.team_count).order("slot_index"),
        supabase.rpc("get_public_players", { _tid: tournament.id }),
      ]);
      if (teamsError) throw teamsError;
      if (playersError) throw playersError;
      return { tournament, teams: teams ?? [], players: players ?? [] };
    },
  });

  return (
    <div className="min-h-screen">
      <SiteHeader name={query.data?.tournament?.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Squads</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Teams & rosters</h1>
        <p className="mt-2 text-sm text-muted-foreground">Approved players only. Each team can contain up to {query.data?.tournament?.players_per_team ?? 7} players.</p>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading teams…</p> : query.error ? <p role="alert" className="mt-8 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{(query.error as Error).message}</p> : !query.data ? <p className="mt-8 rounded-md bg-muted p-4">No active tournament found.</p> : (
          <>
            <p className="mt-5 text-sm text-muted-foreground">{query.data.tournament.name} · Season {query.data.tournament.season}</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {query.data.teams.map(team => {
                const players = query.data!.players.filter(player => player.team_id === team.id);
                return <section key={team.id} className="rounded-xl border bg-card p-5">
                  <div className="flex items-start justify-between gap-3"><h2 className="font-display text-2xl font-bold uppercase">{team.name}</h2><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{players.length}/{query.data!.tournament.players_per_team}</span></div>
                  <div className="mt-4 space-y-2">
                    {players.length ? players.map((player,index)=><div key={player.id} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0"><span>{index+1}. {player.full_name}</span><span className="text-xs text-muted-foreground">{player.preferred_position || "—"}</span></div>) : <p className="text-sm text-muted-foreground">No approved players yet.</p>}
                  </div>
                </section>;
              })}
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-primary"><Link to="/fixtures">View fixtures →</Link><Link to="/table">View league table →</Link></div>
          </>
        )}
      </main>
    </div>
  );
}
