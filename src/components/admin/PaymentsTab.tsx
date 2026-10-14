import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Confirm, Empty, ErrorBox, Loading, useAdminRefresh, useTeams, type Tournament } from "./shared";
import { fmtDate, friendlyError, naira } from "@/lib/format";

type Status = Enums<"registration_status">;

export function PaymentsTab({ t }: { t: Tournament }) {
  const [status, setStatus] = useState<Status>("pending");
  const [q, setQ] = useState("");
  const refresh = useAdminRefresh();
  const teams = useTeams(t.id);
  const regs = useQuery({
    queryKey: ["admin", "registrations", t.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("registrations").select("*").eq("tournament_id", t.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 };
    regs.data?.forEach((r) => c[r.status]++);
    return c;
  }, [regs.data]);

  const occupancy = useMemo(() => {
    const m = new Map<string, number>();
    regs.data?.forEach((r) => r.team_id && r.status === "approved" && m.set(r.team_id, (m.get(r.team_id) ?? 0) + 1));
    return m;
  }, [regs.data]);

  const rows = (regs.data ?? []).filter((r) => r.status === status).filter((r) => {
    const s = q.trim().toLowerCase();
    if (!s) return true;
    return [r.full_name, r.phone, r.code, r.payment_reference ?? "", r.email ?? ""].some((v) => v.toLowerCase().includes(s));
  });
  const teamName = (id: string | null) => teams.data?.find((x) => x.id === id)?.name ?? "—";
  const activeTeams = (teams.data ?? []).filter((x) => x.slot_index < t.team_count);
  const capacity = t.team_count * t.players_per_team;

  async function approve(id: string) {
    const { data, error } = await supabase.rpc("approve_registration", { _reg_id: id });
    if (error) return void toast.error(friendlyError(error));
    toast.success(`Approved — randomly assigned to ${data?.[0]?.team_name}`);
    refresh();
  }
  async function reject(id: string, reason: string) {
    const { error } = await supabase.rpc("reject_registration", { _reg_id: id, _reason: reason });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Registration rejected");
    refresh();
  }
  async function move(id: string, team: string) {
    const { error } = await supabase.rpc("reassign_player", { _reg_id: id, _team_id: team });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Player moved");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {activeTeams.map((tm) => {
          const n = occupancy.get(tm.id) ?? 0;
          return (
            <div key={tm.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between font-semibold">{tm.name}<span className="text-sm text-muted-foreground">{n}/{t.players_per_team}</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden><div className="h-full bg-primary" style={{ width: `${(n / t.players_per_team) * 100}%` }} /></div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-muted-foreground">
        {counts.approved}/{capacity} places filled · fee {naira(t.fee)} · confirmed fees {naira(counts.approved * t.fee)}. Check each transfer in your {t.bank_name} account before approving — nothing is verified automatically.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected"] as Status[]).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} onClick={() => setStatus(s)} className="capitalize">
            {s} <Badge variant="secondary" className="ml-2">{counts[s]}</Badge>
          </Button>
        ))}
        <Input aria-label="Search registrations" placeholder="Search name, phone, code, reference…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
      </div>

      {regs.isLoading ? <Loading /> : regs.error ? <ErrorBox error={regs.error} /> : rows.length === 0 ? (
        <Empty>No {status} registrations{q && " match your search"}.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{r.full_name} <span className="font-mono text-xs text-muted-foreground">{r.code}</span></div>
                  <div className="mt-1 grid gap-x-6 gap-y-1 text-sm text-muted-foreground sm:grid-cols-2">
                    <span>Phone: +{r.phone}</span>
                    <span>Email: {r.email ?? "—"}</span>
                    <span>Position: {r.preferred_position ?? "—"}</span>
                    <span>Payment ref: <strong className="text-foreground">{r.payment_reference ?? "none given"}</strong></span>
                    <span>Submitted: {fmtDate(r.created_at)}</span>
                    {r.status === "approved" && <span>Team: <strong className="text-foreground">{teamName(r.team_id)}</strong></span>}
                    {r.review_note && <span className="sm:col-span-2">Note: {r.review_note}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status === "pending" && (
                    <>
                      <Confirm
                        trigger={<Button size="sm">Approve payment</Button>}
                        title={`Approve ${r.full_name}?`}
                        description={<>Confirm you have seen a {naira(t.fee)} transfer{r.payment_reference ? <> with reference <strong>{r.payment_reference}</strong></> : null}. The player will be randomly assigned to a team with space. This cannot be undone from here.</>}
                        confirmLabel="Approve & assign"
                        onConfirm={() => approve(r.id)}
                      />
                      <RejectButton name={r.full_name} onReject={(reason) => reject(r.id, reason)} />
                    </>
                  )}
                  {r.status === "approved" && (
                    <MoveButton name={r.full_name} current={r.team_id} teams={activeTeams.filter((x) => (occupancy.get(x.id) ?? 0) < t.players_per_team && x.id !== r.team_id)} onMove={(team) => move(r.id, team)} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RejectButton({ name, onReject }: { name: string; onReject: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <Confirm
      destructive
      trigger={<Button size="sm" variant="outline">Reject</Button>}
      title={`Reject ${name}?`}
      description={
        <div className="space-y-2">
          <p>The reason is shown to the player when they check their status.</p>
          <Textarea aria-label="Rejection reason" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. No matching transfer found" />
        </div>
      }
      confirmLabel="Reject"
      onConfirm={() => onReject(reason)}
    />
  );
}

function MoveButton({ name, teams, onMove }: { name: string; current: string | null; teams: { id: string; name: string }[]; onMove: (team: string) => Promise<void> }) {
  const [team, setTeam] = useState<string>("");
  if (teams.length === 0) return <span className="text-xs text-muted-foreground">No other team has space</span>;
  return (
    <div className="flex gap-2">
      <Select value={team} onValueChange={setTeam}>
        <SelectTrigger className="h-9 w-36" aria-label="Move to team"><SelectValue placeholder="Move to…" /></SelectTrigger>
        <SelectContent>{teams.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
      </Select>
      <Confirm
        trigger={<Button size="sm" variant="outline" disabled={!team}>Move</Button>}
        title={`Move ${name}?`}
        description={`Move this player to ${teams.find((x) => x.id === team)?.name}. This is recorded in the audit log.`}
        onConfirm={() => onMove(team)}
      />
    </div>
  );
}