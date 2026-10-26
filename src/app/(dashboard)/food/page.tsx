"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RankLive } from "@/components/rank-live";
import { logConfirmation, type RankProgress } from "@/lib/rank-core";
import { announceRankChange, type RankSnapshot } from "@/lib/rank-events";

type FoodLog = {
  id: string;
  description: string;
  calories: number | null;
  loggedAt: string;
};

const QUICK_PICKS = ["Oatmeal & eggs", "Jollof rice & chicken", "Grilled fish & salad", "Protein shake"];

export default function FoodPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ description: "", calories: "" });

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/food", { cache: "no-store" });
      if (res.ok) setLogs((await res.json()) as FoodLog[]);
      else if (res.status === 401) setError("Your session expired — log in again.");
    } catch {
      setError("Could not load your meals.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: form.description,
        calories: form.calories || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not save that meal.");
      return;
    }

    const data = (await res.json().catch(() => null)) as { rank?: RankSnapshot } | null;

    setForm({ description: "", calories: "" });
    setMessage(
      data?.rank ? logConfirmation(data.rank as RankProgress, data.rank.streak) : "Meal logged.",
    );
    if (data?.rank) announceRankChange(data.rank);
    router.refresh();
    void loadLogs();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this food log?")) return;
    const res = await fetch(`/api/food?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { rank?: RankSnapshot } | null;
      if (data?.rank) announceRankChange(data.rank);
      router.refresh();
      void loadLogs();
    } else {
      setError("Could not delete that log.");
    }
  }

  const todayKey = new Date().toDateString();
  const caloriesToday = logs
    .filter((log) => new Date(log.loggedAt).toDateString() === todayKey)
    .reduce((sum, log) => sum + (log.calories ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Nutrition</p>
        <h1 className="mt-2 text-3xl font-semibold">Food log</h1>
        <p className="mt-2 text-sm text-muted">
          Write what you actually ate. Estimates are fine — honesty is the point.
        </p>
      </header>

      <RankLive />

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="description">What did you eat?</label>
          <input
            id="description"
            className="input"
            placeholder="e.g. Jollof rice with grilled chicken"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => setForm({ ...form, description: pick })}
                className="tag hover:border-gold/50 hover:text-goldSoft"
              >
                {pick}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="calories">Calories (optional)</label>
          <input
            id="calories"
            type="number"
            min={0}
            max={20000}
            className="input"
            placeholder="620"
            value={form.calories}
            onChange={(event) => setForm({ ...form, calories: event.target.value })}
          />
        </div>

        {error && <p className="alert-error">{error}</p>}
        {message && <p className="alert-success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Log meal"}
        </button>
      </form>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Recently logged</h2>
          <span className="text-xs text-muted">
            {caloriesToday.toLocaleString("en-NG")} kcal today
          </span>
        </div>

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
          {loading && <li className="px-5 py-6 text-sm text-muted">Loading…</li>}
          {!loading && logs.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">Nothing logged yet.</li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">{log.description}</p>
                <p className="text-xs text-muted">
                  {log.calories ? `${log.calories} kcal · ` : ""}
                  {new Date(log.loggedAt).toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(log.id)}
                className="btn-ghost btn-sm text-danger hover:text-danger"
                aria-label={`Delete ${log.description}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
