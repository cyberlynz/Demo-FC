import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Enums, Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Confirm, Empty, ErrorBox, Loading, useAdminRefresh, useTeams, type Tournament } from "./shared";
import { fmtDate, friendlyError, nil } from "@/lib/format";

type Match = Tables<"matches">;
type Ev = Tables<"match_events">;
type Status = Enums<"match_status">;
type EvType = Enums<"event_type">;

const EVENT_LABEL: Record<EvType, string> = {
  goal: "Goal", penalty_goal: "Penalty goal", own_goal: "Own goal", yellow_card: "Yellow card", red_card: "Red card",
};
const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";

export function MatchesTab({ t }: { t: Tournament }) {
  const refresh = useAdminRefresh();
  const teams = useTeams(t.id);
  const data = useQuery({
    queryKey: ["admin", "matches", t.id],
    queryFn: async () => {
      const [m, e, p] = await Promise.all([
        supabase.from("matches").select("*").eq("tournament_id", t.id).order("round").order("created_at"),
        supabase.from("match_events").select("*").order("minute", { nullsFirst: false }),
        supabase.from("registrations").select("id, full_name, team_id").eq("tournament_id", t.id).eq("status", "approved"),
      ]);
      if (m.error) throw m.error;
      if (e.error) throw e.error;
      if (p.error) throw p.error;
      return { matches: m.data, events: e.data, players: p.data };
    },
  });
  const [open, setOpen] = useState<string | null>(null);

  async function generate(force: boolean) {
    const { data: n, error } = await supabase.rpc("generate_fixtures", { _tid: t.id, _force: force });
    if (error) return void toast.error(friendlyError(error));
    toast.success(`${n} home & away fixtures created`);
    refresh();
  }

  if (data.isLoading || teams.isLoading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} />;
  const teamName = (id: string) => teams.data?.find((x) => x.id === id)?.name ?? "?";
  const { matches, events, players } = data.data!;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Double round-robin: every team plays each other home and away. {matches.length} fixtures.</p>
        {matches.length === 0 ? (
          <Button onClick={() => generate(false)}>Generate fixtures</Button>
        ) : (
          <Confirm destructive trigger={<Button variant="outline">Regenerate fixtures</Button>} title="Regenerate fixtures?"
            description="All current fixtures will be replaced. This is blocked once any result or event is recorded." confirmLabel="Regenerate" onConfirm={() => generate(true)} />
        )}
      </div>
      {matches.length === 0 ? <Empty>No fixtures yet.</Empty> : matches.map((m) => (
        <MatchRow key={m.id} m={m} home={teamName(m.home_team_id)} away={teamName(m.away_team_id)}
          events={events.filter((e) => e.match_id === m.id)} players={players.filter((p) => p.team_id === m.home_team_id || p.team_id === m.away_team_id)}
          open={open === m.id} onToggle={() => setOpen(open === m.id ? null : m.id)} onChange={refresh} />
      ))}
    </div>
  );
}

function MatchRow({ m, home, away, events, players, open, onToggle, onChange }: {
  m: Match; home: string; away: string; events: Ev[]; players: { id: string; full_name: string; team_id: string | null }[];
  open: boolean; onToggle: () => void; onChange: () => void;
}) {
  const [hs, setHs] = useState(m.home_score?.toString() ?? "");
  const [as, setAs] = useState(m.away_score?.toString() ?? "");
  const [status, setStatus] = useState<Status>(m.status);
  const [date, setDate] = useState(m.match_date ? m.match_date.slice(0, 16) : "");
  const [venue, setVenue] = useState(m.venue ?? "");
  const [busy, setBusy] = useState(false);
  const [ev, setEv] = useState<{ type: EvType; player: string; assist: string; minute: string }>({ type: "goal", player: "", assist: "", minute: "" });
  const name = (id: string | null) => players.find((p) => p.id === id)?.full_name ?? "Unknown player";

  async function save() {
    const num = (v: string) => (v.trim() === "" ? nil<number>() : Number(v));
    setBusy(true);
    const { error } = await supabase.rpc("save_match", {
      _match_id: m.id, _home: num(hs), _away: num(as), _status: status,
      _date: date ? new Date(date).toISOString() : nil<string>(), _venue: venue, _round: m.round,
    });
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Match saved");
    onChange();
  }
  async function addEvent() {
    if (!ev.player) return void toast.error("Choose a player");
    const { error } = await supabase.rpc("add_match_event", {
      _match_id: m.id, _player_id: ev.player, _type: ev.type,
      _assist_id: ev.type === "goal" && ev.assist ? ev.assist : nil<string>(),
      _minute: ev.minute ? Number(ev.minute) : nil<number>(),
    });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Event added");
    setEv({ type: ev.type, player: "", assist: "", minute: "" });
    onChange();
  }
  async function del(id: string) {
    const { error } = await supabase.rpc("delete_match_event", { _id: id });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Event removed");
    onChange();
  }

  return (
    <div className="rounded-lg border bg-card">
      <button type="button" onClick={onToggle} className="flex w-full flex-wrap items-center justify-between gap-2 p-4 text-left">
        <span className="text-xs text-muted-foreground">Round {m.round}</span>
        <span className="font-semibold">{home} <span className="mx-2 font-display text-lg">{m.home_score ?? "–"} : {m.away_score ?? "–"}</span> {away}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">{fmtDate(m.match_date)} <Badge variant={m.status === "completed" ? "default" : "secondary"}>{m.status}</Badge></span>
      </button>
      {open && (
        <div className="space-y-4 border-t p-4">
          <div className="grid gap-2 sm:grid-cols-6">
            <label className="text-xs">{home} score<Input type="number" min={0} value={hs} onChange={(e) => setHs(e.target.value)} /></label>
            <label className="text-xs">{away} score<Input type="number" min={0} value={as} onChange={(e) => setAs(e.target.value)} /></label>
            <label className="text-xs">Status<select className={`${sel} w-full`} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {(["scheduled", "completed", "postponed", "cancelled"] as const).map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="text-xs sm:col-span-2">Kick-off<Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <label className="text-xs">Venue<Input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>
          </div>
          <Button size="sm" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save match"}</Button>

          <div>
            <h4 className="mb-2 font-semibold">Match events</h4>
            {events.length === 0 ? <p className="text-sm text-muted-foreground">No events recorded.</p> : (
              <ul className="space-y-1 text-sm">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded border px-3 py-1.5">
                    <span>{e.minute != null && `${e.minute}' `}<b>{EVENT_LABEL[e.type]}</b> — {name(e.player_id)}{e.assist_player_id && ` (assist: ${name(e.assist_player_id)})`}</span>
                    <Confirm destructive trigger={<Button size="sm" variant="ghost">Remove</Button>} title="Remove event?" description="This updates top scorers and cards." confirmLabel="Remove" onConfirm={() => del(e.id)} />
                  </li>
                ))}
              </ul>
            )}
            {players.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No approved players on these teams yet.</p> : (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <select aria-label="Event type" className={sel} value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value as EvType, assist: "" })}>
                  {Object.entries(EVENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <select aria-label="Player" className={sel} value={ev.player} onChange={(e) => setEv({ ...ev, player: e.target.value, assist: "" })}>
                  <option value="">Player…</option>{players.map((p) => <option key={p.id} value={p.id}>{p.full_name} ({p.team_id === m.home_team_id ? home : away})</option>)}</select>
                {ev.type === "goal" && (
                  <select aria-label="Assist" className={sel} value={ev.assist} onChange={(e) => setEv({ ...ev, assist: e.target.value })}>
                    <option value="">No assist</option>
                    {players.filter((p) => p.id !== ev.player && p.team_id === players.find((x) => x.id === ev.player)?.team_id).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
                  </select>
                )}
                <Input aria-label="Minute" className="w-24" type="number" min={0} max={130} placeholder="Min" value={ev.minute} onChange={(e) => setEv({ ...ev, minute: e.target.value })} />
                <Button size="sm" onClick={addEvent}>Add event</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}