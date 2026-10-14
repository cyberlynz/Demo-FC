import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorBox, Loading, useAdminRefresh, useTeams, type Team, type Tournament } from "./shared";
import { friendlyError } from "@/lib/format";

export function SettingsTab({ t }: { t: Tournament }) {
  const refresh = useAdminRefresh();
  const teams = useTeams(t.id);
  const [s, setS] = useState({
    name: t.name, season: t.season, fee: String(t.fee), bank_name: t.bank_name, account_name: t.account_name,
    account_number: t.account_number, donation_message: t.donation_message, registration_open: t.registration_open,
    team_count: String(t.team_count), players_per_team: String(t.players_per_team),
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof s) => (e: { target: { value: string } }) => setS({ ...s, [k]: e.target.value });

  async function save() {
    const fee = Number(s.fee), tc = Number(s.team_count), ppt = Number(s.players_per_team);
    if (!s.name.trim()) return void toast.error("Tournament name is required");
    if (!Number.isInteger(fee) || fee < 0) return void toast.error("Fee must be a whole number");
    if (!Number.isInteger(tc) || tc < 2 || tc > 32) return void toast.error("Number of teams must be 2–32");
    if (!Number.isInteger(ppt) || ppt < 1 || ppt > 30) return void toast.error("Players per team must be 1–30");
    if (!/^\d{10}$/.test(s.account_number)) return void toast.error("Account number must be 10 digits");
    setBusy(true);
    const { error } = await supabase.rpc("update_tournament_settings", {
      _tid: t.id,
      _s: { ...s, name: s.name.trim(), fee, team_count: tc, players_per_team: ppt },
    });
    setBusy(false);
    if (error) return void toast.error(friendlyError(error));
    toast.success("Settings saved");
    refresh();
  }

  const field = (label: string, k: keyof typeof s, props: Record<string, unknown> = {}) => (
    <label className="space-y-1 text-sm"><span className="font-medium">{label}</span>
      <Input value={s[k] as string} onChange={set(k)} {...props} /></label>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h3 className="font-display text-xl font-bold uppercase">Tournament</h3>
        {field("Name", "name")}
        {field("Season", "season")}
        {field("Registration fee (₦)", "fee", { type: "number", min: 0 })}
        <div className="grid grid-cols-2 gap-3">
          {field("Number of teams", "team_count", { type: "number", min: 2 })}
          {field("Players per team", "players_per_team", { type: "number", min: 1 })}
        </div>
        <label className="flex items-center justify-between rounded-md border p-3 text-sm">
          <span className="font-medium">Registration open</span>
          <Switch checked={s.registration_open} onCheckedChange={(v) => setS({ ...s, registration_open: v })} />
        </label>
        <h3 className="pt-2 font-display text-xl font-bold uppercase">Payment details</h3>
        {field("Bank", "bank_name")}
        {field("Account name", "account_name")}
        {field("Account number", "account_number", { inputMode: "numeric", maxLength: 10 })}
        <label className="space-y-1 text-sm"><span className="font-medium">Donation message</span>
          <Textarea value={s.donation_message} onChange={set("donation_message")} /></label>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
        <p className="text-xs text-muted-foreground">Reducing teams or capacity is blocked if it would drop players or fixtures.</p>
      </section>
      <section className="space-y-3 rounded-lg border bg-card p-5">
        <h3 className="font-display text-xl font-bold uppercase">Team names</h3>
        {teams.isLoading ? <Loading /> : teams.error ? <ErrorBox error={teams.error} /> :
          teams.data?.map((tm) => <TeamName key={tm.id} team={tm} onSaved={refresh} />)}
      </section>
    </div>
  );
}

function TeamName({ team, onSaved }: { team: Team; onSaved: () => void }) {
  const [name, setName] = useState(team.name);
  async function save() {
    if (!name.trim()) return void toast.error("Team name is required");
    const { error } = await supabase.rpc("rename_team", { _team_id: team.id, _name: name.trim() });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Team renamed");
    onSaved();
  }
  return (
    <div className="flex gap-2">
      <Input aria-label={`Name for slot ${team.slot_index + 1}`} value={name} onChange={(e) => setName(e.target.value)} />
      <Button variant="outline" disabled={name === team.name} onClick={save}>Rename</Button>
    </div>
  );
}