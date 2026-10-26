"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setError(data.error || "Could not send the reset link. Please try again.");
        return;
      }

      // The API answers the same way for every address on purpose.
      setSent(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="card text-center">
        <span className="text-3xl" aria-hidden="true">✉️</span>
        <h1 className="mt-3 text-2xl font-semibold">Check your inbox</h1>
        <p className="mt-2 text-sm text-muted">
          If an account exists for <span className="text-ink">{email}</span>, we&apos;ve sent a
          link to choose a new password. It works for 60 minutes and can be used once.
        </p>
        <p className="mt-3 text-xs text-muted">
          Nothing arrived? Check spam, or wait a couple of minutes and try again.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" className="btn-secondary" onClick={() => setSent(false)}>
            Use a different email
          </button>
          <Link href="/login" className="btn-primary">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted">
        Enter the email you signed up with and we&apos;ll send a link to set a new one.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-gold hover:text-goldSoft">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
