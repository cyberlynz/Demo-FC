import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Empty, ErrorBox, Loading } from "./shared";
import { fmtDate } from "@/lib/format";

export function AuditTab() {
  const [q, setQ] = useState("");
  const logs = useQuery({
    queryKey: ["admin", "audit"],
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return data;
    },
  });
  const rows = (logs.data ?? []).filter((l) => !q || JSON.stringify(l).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-4">
      <Input aria-label="Search audit log" placeholder="Filter by action, code, team…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      {logs.isLoading ? <Loading /> : logs.error ? <ErrorBox error={logs.error} /> : rows.length === 0 ? <Empty>No audit entries yet.</Empty> : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">Action</th><th className="p-3">Details</th><th className="p-3">By</th></tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-3">{fmtDate(l.created_at)}</td>
                  <td className="p-3 font-medium">{l.action.replace(/_/g, " ")}</td>
                  <td className="p-3 font-mono text-xs">{Object.entries((l.details ?? {}) as Record<string, unknown>).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join(" · ") || "—"}</td>
                  <td className="p-3 font-mono text-xs text-muted-foreground">{l.actor_id?.slice(0, 8) ?? "system"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}