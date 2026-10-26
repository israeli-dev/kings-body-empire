"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Logo } from "./logo";
import { RankBadge } from "./rank-badge";
import { LogoutButton } from "./logout-button";
import type { RankName } from "@/types";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/workouts", label: "Workouts" },
  { href: "/food", label: "Food" },
  { href: "/measurements", label: "Measurements" },
  { href: "/education", label: "Education" },
  { href: "/book-call", label: "Book a call" },
];

export function DashboardNav({ initialRank }: { initialRank: RankName }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [rank, setRank] = useState<RankName>(initialRank);
  const [open, setOpen] = useState(false);
  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    let active = true;
    fetch("/api/rank")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { rank?: RankName } | null) => {
        if (active && data?.rank) setRank(data.rank);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname]);

  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo href="/dashboard" />
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${
                    active
                      ? "bg-panel2 font-semibold text-gold"
                      : "text-muted hover:bg-panel2 hover:text-ink"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <RankBadge rank={rank} />
          <span className="hidden text-sm text-muted sm:inline">
            {session?.user?.name ?? ""}
          </span>
          <LogoutButton />
          <button
            type="button"
            className="btn-secondary btn-sm lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-panel lg:hidden">
          <div className="container-page grid gap-1 py-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded-lg px-3 py-2 text-sm ${
                  pathname === link.href
                    ? "bg-panel2 font-semibold text-gold"
                    : "text-muted hover:bg-panel2 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
