import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { naira } from "@/lib/format";

export const Route = createFileRoute("/donations")({
  head: () => ({ meta: [{ title: "Support the league — Demo FC League" }] }),
  component: DonationsPage,
});

type PublicDonation = { name: string; amount: number };
function DonationsPage() {
  const query = useQuery({
    queryKey: ["public-donations-page"],
    queryFn: async () => {
      const { data: tournament, error: tErr } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (tErr) throw tErr;
      if (!tournament) return null;
      const { data, error } = await supabase.rpc("get_public_donations", { _tid: tournament.id });
      if (error) throw error;
      const row = data?.[0];
      const recent = Array.isArray(row?.recent) ? row.recent as PublicDonation[] : [];
      return { tournament, total: Number(row?.total ?? 0), donorCount: Number(row?.donor_count ?? 0), recent };
    },
  });
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [success,setSuccess] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; setMessage(""); setSuccess(false);
    const fd = new FormData(e.currentTarget);
    const amount = Number(fd.get("amount"));
    const donor = String(fd.get("donor_name") ?? "").trim();
    const note = String(fd.get("message") ?? "").trim();
    const reference = String(fd.get("reference") ?? "").trim();
    const showName = fd.get("show_name") === "on";
    if (!Number.isSafeInteger(amount) || amount < 1) { setMessage("Enter a donation amount of at least ₦1."); return; }
    setBusy(true);
    try {
      const { error } = await supabase.rpc("submit_donation", {
        _donor_name: donor || null as unknown as string,
        _amount: amount,
        _message: note || null as unknown as string,
        _ref: reference || null as unknown as string,
        _show_name: showName,
      });
      if (error) throw error;
      setSuccess(true); form.reset(); query.refetch();
    } catch(err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally { setBusy(false); }
  }

  const t = query.data?.tournament;
  return <div className="min-h-screen"><SiteHeader name={t?.name}/><main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1fr_.9fr]"><section className="rounded-xl border bg-card p-5 sm:p-7"><p className="text-sm font-semibold uppercase tracking-wide text-primary">Community support</p><h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Support the league</h1><p className="mt-3 text-sm text-muted-foreground">{t?.donation_message || "Your contribution helps make grassroots football possible."}</p>{t && <div className="mt-5 rounded-lg bg-muted p-4"><p className="text-sm text-muted-foreground">Transfer your donation to</p><p className="mt-2 font-semibold">{t.bank_name} · {t.account_name}</p><p className="font-mono text-lg">{t.account_number}</p><p className="mt-2 text-sm">Your donation is displayed in confirmed totals only after an organiser verifies it.</p></div>}<form className="mt-6 space-y-4" onSubmit={submit}><div><label htmlFor="amount" className="mb-1 block text-sm font-medium">Donation amount (₦)</label><input id="amount" name="amount" type="number" min="1" max="100000000" step="1" required className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="5000"/></div><div><label htmlFor="donor_name" className="mb-1 block text-sm font-medium">Name (optional)</label><input id="donor_name" name="donor_name" maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Leave blank to donate anonymously"/></div><div><label htmlFor="reference" className="mb-1 block text-sm font-medium">Transfer reference (optional)</label><input id="reference" name="reference" maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2"/></div><div><label htmlFor="message" className="mb-1 block text-sm font-medium">Message (optional)</label><textarea id="message" name="message" maxLength={500} rows={3} className="w-full rounded-md border border-input bg-background px-3 py-2"/></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show_name" defaultChecked/> Show my name publicly if my donation is confirmed</label>{message && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}{success && <p role="status" className="rounded-md bg-primary/10 p-3 text-sm text-primary">Donation submitted. It will appear in the total after manual confirmation.</p>}<Button className="w-full" type="submit" disabled={busy}>{busy?"Submitting…":"Submit donation"}</Button></form></section><aside className="space-y-4"><section className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Confirmed donations</p><p className="mt-2 font-display text-4xl font-extrabold">{naira(query.data?.total ?? 0)}</p><p className="mt-1 text-sm text-muted-foreground">{query.data?.donorCount ?? 0} confirmed donations</p></section><section className="rounded-xl border bg-card p-5"><h2 className="font-display text-2xl font-bold uppercase">Recent supporters</h2>{query.data?.recent.length ? <div className="mt-4 space-y-3">{query.data.recent.map((donation,index)=><div key={index} className="flex justify-between gap-4 border-b pb-2 text-sm last:border-0"><span>{donation.name}</span><span className="font-semibold">{naira(donation.amount)}</span></div>)}</div>:<p className="mt-3 text-sm text-muted-foreground">No confirmed donations to display yet.</p>}</section><section className="rounded-xl border bg-card p-5"><p className="text-sm text-muted-foreground">Want to play in the tournament?</p><Link to="/register" className="mt-2 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Register as a player →</Link></section></aside></main></div>;
}
