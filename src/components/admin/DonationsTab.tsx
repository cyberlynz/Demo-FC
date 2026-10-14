import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Confirm, Empty, ErrorBox, Loading, useAdminRefresh, type Tournament } from "./shared";
import { fmtDate, friendlyError, naira } from "@/lib/format";

type S = Enums<"donation_status">;

export function DonationsTab({ t }: { t: Tournament }) {
  const [status, setStatus] = useState<S | "all">("pending");
  const [q, setQ] = useState("");
  const refresh = useAdminRefresh();
  const list = useQuery({
    queryKey: ["admin", "donations", t.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("donations").select("*").eq("tournament_id", t.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const all = list.data ?? [];
  const confirmedTotal = all.filter((d) => d.status === "confirmed").reduce((s, d) => s + d.amount, 0);
  const pendingTotal = all.filter((d) => d.status === "pending").reduce((s, d) => s + d.amount, 0);
  const rows = all.filter((d) => status === "all" || d.status === status).filter((d) => {
    const s = q.trim().toLowerCase();
    return !s || [d.donor_name ?? "", d.transfer_reference ?? "", d.message ?? ""].some((v) => v.toLowerCase().includes(s));
  });

  async function review(id: string, st: S, show: boolean) {
    const { error } = await supabase.rpc("review_donation", { _id: id, _status: st, _show_name: show });
    if (error) return void toast.error(friendlyError(error));
    toast.success("Donation updated");
    refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Confirmed (shown publicly)</div><div className="font-display text-3xl font-bold">{naira(confirmedTotal)}</div></div>
        <div className="rounded-lg border bg-card p-4"><div className="text-xs uppercase text-muted-foreground">Awaiting review</div><div className="font-display text-3xl font-bold">{naira(pendingTotal)}</div></div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "confirmed", "rejected", "all"] as const).map((s) => (
          <Button key={s} size="sm" variant={status === s ? "default" : "outline"} className="capitalize" onClick={() => setStatus(s)}>{s}</Button>
        ))}
        <Input aria-label="Search donations" placeholder="Search donor, reference…" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto max-w-xs" />
      </div>
      {list.isLoading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : rows.length === 0 ? <Empty>No donations here yet.</Empty> : (
        <ul className="space-y-3">
          {rows.map((d) => (
            <li key={d.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div className="text-sm">
                <div className="font-semibold">{naira(d.amount)} · {d.donor_name ?? "Anonymous"} <Badge variant="outline" className="ml-1 capitalize">{d.status}</Badge></div>
                <div className="mt-1 text-muted-foreground">Ref: {d.transfer_reference ?? "—"} · {fmtDate(d.created_at)}</div>
                {d.message && <p className="mt-1 italic">“{d.message}”</p>}
                <label className="mt-2 flex items-center gap-2 text-xs">
                  <Switch checked={d.show_name} onCheckedChange={(v) => review(d.id, d.status, v)} aria-label="Show donor name publicly" />
                  Show name publicly
                </label>
              </div>
              <div className="flex gap-2">
                {d.status !== "confirmed" && (
                  <Confirm trigger={<Button size="sm">Confirm received</Button>} title="Confirm donation?" description={`Only confirm after seeing ${naira(d.amount)} arrive in the ${t.bank_name} account.`} onConfirm={() => review(d.id, "confirmed", d.show_name)} />
                )}
                {d.status !== "rejected" && (
                  <Confirm destructive trigger={<Button size="sm" variant="outline">Reject</Button>} title="Reject donation?" description="It will be excluded from public totals." onConfirm={() => review(d.id, "rejected", d.show_name)} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}