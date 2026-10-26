"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "./logo";

const LINKS = [
  { href: "/pricing", label: "Programs" },
  { href: "/books", label: "Books" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="btn-ghost">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Start free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn-secondary md:hidden"
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-line bg-panel md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-2.5 text-sm text-muted hover:bg-panel2 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2">
              <Link href="/login" className="btn-secondary flex-1" onClick={() => setOpen(false)}>
                Log in
              </Link>
              <Link href="/signup" className="btn-primary flex-1" onClick={() => setOpen(false)}>
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
