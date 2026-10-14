import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type Tournament = Tables<"tournaments">;
export type Team = Tables<"teams">;

export function useTeams(tid: string) {
  return useQuery({
    queryKey: ["admin", "teams", tid],
    queryFn: async () => {
      const { data, error } = await supabase.from("teams").select("*").eq("tournament_id", tid).order("slot_index");
      if (error) throw error;
      return data;
    },
  });
}

export function useAdminRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["admin"] });
}

export function Confirm({
  trigger, title, description, confirmLabel = "Confirm", onConfirm, destructive,
}: {
  trigger: ReactNode; title: string; description: ReactNode; confirmLabel?: string;
  onConfirm: () => Promise<void> | void; destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild><div>{description}</div></AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : undefined}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try { await onConfirm(); setOpen(false); } finally { setBusy(false); }
            }}
          >
            {busy ? "Working…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Loading() {
  return <div className="p-10 text-center text-sm text-muted-foreground" role="status">Loading…</div>;
}

export function ErrorBox({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">{error instanceof Error ? error.message : String((error as { message?: string })?.message ?? error)}</div>;
}