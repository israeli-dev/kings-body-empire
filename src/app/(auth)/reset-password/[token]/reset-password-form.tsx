"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "next-auth/react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Include at least one letter and one number.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
      };

      if (!res.ok) {
        setError(data.error || "Could not reset that password. Please try again.");
        return;
      }

      setDone(true);

      // Sign them in with the password they just chose.
      if (data.email) {
        const result = await signIn("credentials", {
          email: data.email,
          password,
          redirect: false,
        });
        if (result && !result.error) {
          router.push("/dashboard");
          router.refresh();
          return;
        }
      }

      router.push("/login?reset=1");
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="card text-center">
        <span className="text-3xl" aria-hidden="true">✅</span>
        <h1 className="mt-3 text-2xl font-semibold">Password updated</h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re being signed in. If nothing happens, log in with your new password.
        </p>
        <Link href="/login" className="btn-primary mt-6">Go to log in</Link>
      </div>
    );
  }

  return (
    <div className="card">
      <h1 className="text-2xl font-semibold">Choose a new password</h1>
      <p className="mt-1 text-sm text-muted">
        Pick something you&apos;ll remember — at least 8 characters, with a letter and a number.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className="input"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="confirm">Confirm new password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            className="input"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>

        {error && <p className="alert-error">{error}</p>}

        <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
          {loading ? "Saving…" : "Save new password"}
        </button>
      </form>

      <p className="mt-5 text-sm text-muted">
        Link expired?{" "}
        <Link href="/forgot-password" className="text-gold hover:text-goldSoft">
          Request a new one
        </Link>
      </p>
    </div>
  );
}
