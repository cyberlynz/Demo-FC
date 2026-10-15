import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? "234" + digits.slice(1) : digits;
}

export const Route = createFileRoute("/status")({
  head: () => ({ meta: [{ title: "Registration status — Demo FC League" }, { name: "robots", content: "noindex" }] }),
  component: StatusPage,
});

type Lookup = { code: string; full_name: string; status: "pending" | "approved" | "rejected"; team_name: string | null; review_note: string | null; created_at: string };

function StatusPage() {
  const [busy, setBusy] = useState(false);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [message, setMessage] = useState("");
  const [searched, setSearched] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMessage(""); setLookup(null); setSearched(false);
    const fd = new FormData(e.currentTarget);
    const code = String(fd.get("code") ?? "").trim().toUpperCase();
    const phone = normalizePhone(String(fd.get("phone") ?? ""));
    try {
      const { data, error } = await supabase.rpc("lookup_registration", { _code: code, _phone: phone });
      if (error) throw error;
      setLookup((data?.[0] ?? null) as Lookup | null);
      setSearched(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  const statusLabel = lookup?.status === "approved" ? "Approved" : lookup?.status === "rejected" ? "Rejected" : "Pending review";
  const statusClass = lookup?.status === "approved" ? "bg-primary/10 text-primary" : lookup?.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-foreground";
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Player services</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Check registration status</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the code you received after registering and the same phone number you registered with.</p>
        <form className="mt-6 space-y-4 rounded-xl border bg-card p-5 sm:p-7" onSubmit={submit}>
          <div><label htmlFor="code" className="mb-1 block text-sm font-medium">Registration code</label><input id="code" name="code" required maxLength={20} className="w-full rounded-md border border-input bg-background px-3 py-2 uppercase" placeholder="DFC-ABC234" /></div>
          <div><label htmlFor="phone" className="mb-1 block text-sm font-medium">Phone number</label><input id="phone" name="phone" required inputMode="tel" className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="08012345678" /></div>
          {message && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
          <Button className="w-full" type="submit" disabled={busy}>{busy ? "Checking…" : "Check status"}</Button>
          {searched && !lookup && <p className="rounded-md bg-muted p-3 text-sm">No registration matched that code and phone number. Check both details and try again.</p>}
        </form>
        {lookup && <section className="mt-5 rounded-xl border bg-card p-5 sm:p-7" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-display text-2xl font-bold uppercase">Registration found</h2><span className={`rounded-full px-3 py-1 text-sm font-semibold ${statusClass}`}>{statusLabel}</span></div>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Player</dt><dd className="text-right font-semibold">{lookup.full_name}</dd></div>
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Code</dt><dd className="font-mono">{lookup.code}</dd></div>
            <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Team</dt><dd className="font-semibold">{lookup.team_name || "Not assigned yet"}</dd></div>
          </dl>
          {lookup.status === "pending" && <p className="mt-4 text-sm text-muted-foreground">Your payment is awaiting manual verification. Your team is assigned after approval.</p>}
          {lookup.status === "rejected" && lookup.review_note && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm">{lookup.review_note}</p>}
        </section>}
        <p className="mt-5 text-sm text-muted-foreground">Need to register? <Link to="/register" className="font-semibold text-primary underline-offset-4 hover:underline">Start registration</Link></p>
      </main>
    </div>
  );
}
