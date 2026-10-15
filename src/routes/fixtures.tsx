import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/fixtures")({
  head: () => ({ meta: [{ title: "Fixtures and results — Demo FC League" }] }),
  component: FixturesPage,
});

function FixturesPage() {
  const query = useQuery({
    queryKey: ["public-fixtures"],
    queryFn: async () => {
      const { data: tournament, error: tournamentError } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (tournamentError) throw tournamentError;
      if (!tournament) return null;
      const [{ data: teams, error: teamsError }, { data: matches, error: matchesError }] = await Promise.all([
        supabase.from("teams").select("id,name,slot_index").eq("tournament_id", tournament.id).lt("slot_index", tournament.team_count).order("slot_index"),
        supabase.from("matches").select("*").eq("tournament_id", tournament.id).order("round").order("match_date"),
      ]);
      if (teamsError) throw teamsError;
      if (matchesError) throw matchesError;
      return { tournament, teams: teams ?? [], matches: matches ?? [] };
    },
    refetchInterval: 15000,
  });
  const teamName = (id: string) => query.data?.teams.find(team => team.id === id)?.name ?? "Unknown team";

  return (
    <div className="min-h-screen">
      <SiteHeader name={query.data?.tournament?.name} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Match centre</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Fixtures & results</h1>
        <p className="mt-2 text-sm text-muted-foreground">Home-and-away schedule and published results. Scores refresh automatically while this page is open.</p>
        {query.isLoading ? <p className="mt-8 text-sm text-muted-foreground">Loading fixtures…</p> : query.error ? <p role="alert" className="mt-8 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{(query.error as Error).message}</p> : !query.data ? <p className="mt-8 rounded-md bg-muted p-4">No active tournament found.</p> : query.data.matches.length === 0 ? <section className="mt-8 rounded-xl border bg-card p-6"><h2 className="font-display text-2xl font-bold uppercase">Fixtures are being prepared</h2><p className="mt-2 text-sm text-muted-foreground">The organiser has not published the schedule yet.</p><Link to="/teams" className="mt-3 inline-block text-sm font-semibold text-primary">See teams →</Link></section> : (
          <div className="mt-6 space-y-3">
            {query.data.matches.map(match => <article key={match.id} className="rounded-xl border bg-card p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>Round {match.round}</span><span>{fmtDate(match.match_date)}</span><span className="rounded-full bg-muted px-2 py-1 capitalize">{match.status}</span></div>
              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right font-semibold">{teamName(match.home_team_id)}<p className="text-xs font-normal text-muted-foreground">Home</p></div>
                <div className="min-w-20 rounded-md bg-charcoal px-3 py-2 text-center font-display text-2xl font-bold text-charcoal-foreground">{match.home_score ?? "–"} : {match.away_score ?? "–"}</div>
                <div className="font-semibold">{teamName(match.away_team_id)}<p className="text-xs font-normal text-muted-foreground">Away</p></div>
              </div>
              {match.venue && <p className="mt-2 text-center text-xs text-muted-foreground">{match.venue}</p>}
            </article>)}
          </div>
        )}
      </main>
    </div>
  );
}
