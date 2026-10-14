import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentsTab } from "@/components/admin/PaymentsTab";
import { DonationsTab } from "@/components/admin/DonationsTab";
import { AuditTab } from "@/components/admin/AuditTab";
import { MatchesTab } from "@/components/admin/MatchesTab";
import { SettingsTab } from "@/components/admin/SettingsTab";
import { ErrorBox, Loading } from "@/components/admin/shared";
import { friendlyError } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Demo FC League" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const access = useQuery({
    queryKey: ["admin", "access"],
    queryFn: async () => {
      const [{ data: isAdmin, error }, { data: exists }, { data: t }] = await Promise.all([
        supabase.rpc("is_admin"),
        supabase.rpc("admin_exists"),
        supabase.from("tournaments").select("*").eq("is_current", true).maybeSingle(),
      ]);
      if (error) throw error;
      return { isAdmin: !!isAdmin, exists: !!exists, t };
    },
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  async function claim() {
    const { error } = await supabase.rpc("claim_first_admin");
    if (error) return void toast.error(friendlyError(error));
    toast.success("You are now the admin");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  return (
    <div className="min-h-screen">
      <SiteHeader name={access.data?.t?.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-4xl font-bold uppercase">Admin dashboard</h1>
          <Button variant="outline" size="sm" onClick={signOut}>Sign out</Button>
        </div>
        {access.isLoading ? <Loading /> : access.error ? <ErrorBox error={access.error} /> : !access.data?.isAdmin ? (
          <div className="rounded-lg border bg-card p-6">
            {access.data?.exists ? (
              <p>Your account does not have admin access. Ask an existing admin to grant it.</p>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold uppercase">First-time setup</h2>
                <p className="mt-2 text-sm text-muted-foreground">No admin exists yet. The first signed-in account to claim becomes the only admin; claiming is locked afterwards.</p>
                <Button className="mt-4" onClick={claim}>Make me the admin</Button>
              </>
            )}
          </div>
        ) : !access.data.t ? <ErrorBox error="No current tournament." /> : (
          <Tabs defaultValue="payments">
            <TabsList className="flex-wrap">
              <TabsTrigger value="payments">Player payments</TabsTrigger>
              <TabsTrigger value="donations">Donations</TabsTrigger>
              <TabsTrigger value="matches">Matches &amp; events</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="audit">Audit log</TabsTrigger>
            </TabsList>
            <TabsContent value="payments" className="mt-6"><PaymentsTab t={access.data.t} /></TabsContent>
            <TabsContent value="donations" className="mt-6"><DonationsTab t={access.data.t} /></TabsContent>
            <TabsContent value="matches" className="mt-6"><MatchesTab t={access.data.t} /></TabsContent>
            <TabsContent value="settings" className="mt-6"><SettingsTab key={access.data.t.updated_at} t={access.data.t} /></TabsContent>
            <TabsContent value="audit" className="mt-6"><AuditTab /></TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}