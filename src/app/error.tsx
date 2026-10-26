"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the browser console for local debugging.
    console.error(error);
  }, [error]);

  const isDatabaseError = /prisma|database|connect/i.test(error.message);

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="card max-w-lg text-center">
        <span className="text-3xl" aria-hidden="true">🛠️</span>
        <h1 className="mt-4 text-2xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted">
          {isDatabaseError
            ? "The app could not reach the database. Check that PostgreSQL is running and DATABASE_URL is correct, then run `npm run db:migrate`."
            : "An unexpected error stopped that page from loading."}
        </p>
        <button type="button" onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}
