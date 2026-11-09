"use client";

import { useEffect } from "react";
import Link from "next/link";
import { supportEmail } from "@/lib/env";

/**
 * Boundary for everything under the signed-in app. The layout only needs the
 * session JWT, so this renders inside the nav + footer instead of replacing
 * the whole screen — and the support email is right there when the page
 * itself cannot load.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server-side error (with stack) is already in the platform logs;
    // keep a client-side trace too.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="card max-w-md text-center">
        <span className="text-4xl" aria-hidden="true">⚠️</span>
        <h1 className="mt-4 text-xl font-semibold">This page could not load</h1>
        <p className="mt-2 text-sm text-muted">
          Your account is fine — the data behind this page didn&rsquo;t come through. This is
          usually a database hiccup and clears on its own. If it keeps happening, email{" "}
          <a href={`mailto:${supportEmail}`} className="text-gold hover:underline">
            {supportEmail}
          </a>{" "}
          and we&rsquo;ll sort it out.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/home" className="btn-ghost">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
