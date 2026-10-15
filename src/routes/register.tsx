import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { naira } from "@/lib/format";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Player registration — Demo FC League" }, { name: "robots", content: "index,follow" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const tournament = useQuery({
    queryKey: ["public-tournament", "register"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState<{ code: string; phone: string } | null>(null);
  const [message, setMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    const fd = new FormData(e.currentTarget);
    const fullName = String(fd.get("full_name") ?? "").trim();
    const phone = normalizePhone(String(fd.get("phone") ?? ""));
    const email = String(fd.get("email") ?? "").trim();
    const position = String(fd.get("position") ?? "").trim();
    const reference = String(fd.get("payment_reference") ?? "").trim();
    if (!/^234[789][01][0-9]{8}$/.test(phone)) {
      setMessage("Enter a valid Nigerian mobile number, such as 08012345678 or +2348012345678.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("register_player", {
        _full_name: fullName,
        _phone: phone,
        _email: (email || null) as unknown as string,
        _position: (position || null) as unknown as string,
        _payment_reference: (reference || null) as unknown as string,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row?.code) throw new Error("Registration was not created. Please try again.");
      setSuccess({ code: row.code, phone });
      (e.currentTarget as HTMLFormElement).reset();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      if (raw.includes("REGISTRATION_CLOSED")) setMessage("Registration is currently closed.");
      else if (raw.includes("DUPLICATE")) setMessage("A registration with this phone number or payment reference already exists.");
      else setMessage(raw);
    } finally {
      setBusy(false);
    }
  }

  const t = tournament.data;
  return (
    <div className="min-h-screen">
      <SiteHeader name={t?.name} />
      <main className="mx-auto grid max-w-5xl gap-6 px-4 py-8 lg:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-xl border bg-card p-5 sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Join the league</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold uppercase">Player registration</h1>
          <p className="mt-2 text-sm text-muted-foreground">Complete the form and transfer the registration fee. Your place is confirmed only after an organiser verifies payment.</p>
          {tournament.isLoading ? <p className="mt-6 text-sm text-muted-foreground">Loading registration details…</p> : tournament.error ? <p role="alert" className="mt-6 text-sm text-destructive">Could not load registration details: {(tournament.error as Error).message}</p> : !t ? <p className="mt-6 rounded-lg bg-muted p-4">There is no active tournament at the moment.</p> : !t.registration_open ? <p className="mt-6 rounded-lg bg-muted p-4">Registration is currently closed. Please check back later.</p> : success ? (
            <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-2xl font-bold uppercase">Registration submitted</h2>
              <p className="mt-2 text-sm">Keep this registration code and your phone number. You will need both to check your status.</p>
              <p className="my-4 rounded-md bg-card p-4 text-center font-mono text-2xl font-bold tracking-widest">{success.code}</p>
              <p className="text-sm">Your status is pending payment review. Team allocation happens after an organiser confirms your transfer.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button type="button" onClick={() => navigator.clipboard?.writeText(success.code)}>Copy registration code</Button>
                <Button type="button" variant="outline" onClick={() => setSuccess(null)}>Register another player</Button>
                <Link className="inline-flex items-center text-sm font-semibold text-primary underline-offset-4 hover:underline" to="/status">Check registration status →</Link>
              </div>
            </div>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={submit}>
              <div><label className="mb-1 block text-sm font-medium" htmlFor="full_name">Full name</label><input id="full_name" name="full_name" required minLength={2} maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Your full name" /></div>
              <div><label className="mb-1 block text-sm font-medium" htmlFor="phone">Phone number</label><input id="phone" name="phone" required inputMode="tel" autoComplete="tel" className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="08012345678" /><p className="mt-1 text-xs text-muted-foreground">Nigerian mobile number. We use it for your status lookup.</p></div>
              <div><label className="mb-1 block text-sm font-medium" htmlFor="email">Email (optional)</label><input id="email" name="email" type="email" maxLength={255} autoComplete="email" className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="you@example.com" /></div>
              <div><label className="mb-1 block text-sm font-medium" htmlFor="position">Preferred position (optional)</label><select id="position" name="position" className="w-full rounded-md border border-input bg-background px-3 py-2"><option value="">No preference</option><option>Goalkeeper</option><option>Defender</option><option>Midfielder</option><option>Forward</option></select></div>
              <div><label className="mb-1 block text-sm font-medium" htmlFor="payment_reference">Transfer reference (optional)</label><input id="payment_reference" name="payment_reference" maxLength={100} className="w-full rounded-md border border-input bg-background px-3 py-2" placeholder="Reference shown by your bank" /></div>
              {message && <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{message}</p>}
              <Button className="w-full" type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit registration"}</Button>
            </form>
          )}
        </section>
        <aside className="space-y-4">
          {t && <section className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-2xl font-bold uppercase">Registration fee</h2>
            <p className="mt-2 text-3xl font-extrabold">{naira(t.fee)}</p>
            <p className="text-sm text-muted-foreground">Per player · Season {t.season}</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Bank</dt><dd className="text-right font-semibold">{t.bank_name || "Contact organiser"}</dd></div>
              <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Account name</dt><dd className="text-right font-semibold">{t.account_name || "Contact organiser"}</dd></div>
              <div className="flex justify-between gap-4 border-b pb-2"><dt className="text-muted-foreground">Account number</dt><dd className="text-right font-mono font-semibold">{t.account_number || "Not set"}</dd></div>
            </dl>
            <p className="mt-4 rounded-md bg-muted p-3 text-sm">Transfer the fee, then submit this form. Payment is manually verified; do not submit anyone else’s payment details.</p>
          </section>}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-xl font-bold uppercase">Already registered?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Use your registration code and phone number to check your status.</p>
            <Link to="/status" className="mt-3 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline">Check registration status →</Link>
          </section>
        </aside>
      </main>
    </div>
  );
}
