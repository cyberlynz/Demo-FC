import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

export function SiteHeader({ name }: { name?: string | undefined }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold uppercase tracking-wide">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          {name ?? "Demo FC League"}
        </Link>
        <nav className="flex items-center gap-4 text-sm font-semibold">
          <Link to="/" className="opacity-80 hover:opacity-100" activeProps={{ className: "opacity-100" }} activeOptions={{ exact: true }}>
            Home
          </Link>
          <Link to="/admin" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}