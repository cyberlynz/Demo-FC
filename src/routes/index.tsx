import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { naira } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

const homeQuery = queryOptions({
  queryKey: ["public-home"],
  queryFn: async () => {
    const { data: t, error } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
    if (error) throw error;
    if (!t) return null;
    const { data: counts } = await supabase.rpc("get_registration_counts", { _tid: t.id });
    return { t, approved: Number(counts?.[0]?.approved ?? 0) };
  },
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Demo FC League — Annual Football Tournament" },
      { name: "description", content: "Register to play in the annual Demo FC League. ₦5,000 per player, teams of 7, random team draw after payment confirmation." },
      { property: "og:title", content: "Demo FC League — Annual Football Tournament" },
      { property: "og:description", content: "Register to play: ₦5,000 per player, teams of 7, random team draw after payment confirmation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(homeQuery),
  component: Home,
  errorComponent: ({ error }) => <div role="alert" className="p-8">Could not load the tournament: {(error as Error).message}</div>,
});

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  if (!data) return <div className="p-8">No tournament has been set up yet.</div>;
  const { t, approved } = data;
  const capacity = t.team_count * t.players_per_team;
  return (
    <div className="min-h-screen">
      <SiteHeader name={t.name} />
      <section className="bg-pitch-gradient pitch-stripes text-pitch-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="flex flex-wrap gap-2">
            {t.is_demo && <Badge variant="secondary">Demo data</Badge>}
            <Badge variant={t.registration_open ? "default" : "destructive"} className="bg-pitch-foreground text-pitch">
              Registration {t.registration_open ? "open" : "closed"}
            </Badge>
          </div>
          <h1 className="mt-4 font-display text-5xl font-extrabold uppercase md:text-7xl">{t.name}</h1>
          <p className="mt-2 text-lg opacity-90">Season {t.season} · {t.team_count} teams of {t.players_per_team} · home & away</p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            <Stat label="Fee / player" value={naira(t.fee)} />
            <Stat label="Players confirmed" value={`${approved}/${capacity}`} />
            <Stat label="Spots left" value={String(Math.max(capacity - approved, 0))} />
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-display text-2xl font-bold uppercase">How to pay</h2>
          <p className="mt-2 text-sm text-muted-foreground">Make a bank transfer of {naira(t.fee)} to:</p>
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Bank" v={t.bank_name} />
            <Row k="Account number" v={t.account_number} />
            <Row k="Account name" v={t.account_name} />
          </dl>
          <p className="mt-4 rounded-md bg-accent p-3 text-sm text-accent-foreground">
            Your registration stays <strong>pending</strong> until an admin manually confirms your transfer. Payments are not verified automatically. Your team is drawn at random only after confirmation.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-display text-2xl font-bold uppercase">Support the league</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t.donation_message}</p>
          <p className="mt-4 text-sm">Donations go to the same account above and are confirmed manually.</p>
          <Link to="/admin" className="mt-6 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">
            Organiser? Go to admin →
          </Link>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-pitch-foreground/10 p-3 backdrop-blur">
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="text-xs uppercase opacity-80">{label}</div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b pb-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-semibold">{v || "—"}</dd>
    </div>
  );
}