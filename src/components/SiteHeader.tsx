import { Link } from "@tanstack/react-router";
import { Trophy } from "lucide-react";

const navLinks = [
  { to: "/register", label: "Register" },
  { to: "/status", label: "Status" },
  { to: "/teams", label: "Teams" },
  { to: "/fixtures", label: "Fixtures" },
  { to: "/table", label: "Table" },
  { to: "/stats", label: "Stats" },
  { to: "/donations", label: "Donate" },
] as const;

export function SiteHeader({ name }: { name?: string | undefined }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sidebar-border bg-charcoal text-charcoal-foreground">
      <div className="mx-auto flex min-h-14 max-w-6xl flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 font-display text-lg font-bold uppercase tracking-wide sm:text-xl">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Trophy className="h-4 w-4" aria-hidden />
          </span>
          {name ?? "Demo FC League"}
        </Link>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold sm:justify-end sm:gap-x-3 sm:text-sm">
          {navLinks.map((item) => (
            <Link key={item.to} to={item.to} className="py-1 opacity-85 hover:opacity-100" activeProps={{ className: "py-1 text-primary opacity-100" }}>
              {item.label}
            </Link>
          ))}
          <Link to="/admin" className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground hover:bg-primary/90">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
