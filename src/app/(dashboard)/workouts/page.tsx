"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RankLive } from "@/components/rank-live";
import { logConfirmation, type RankProgress } from "@/lib/rank-core";
import { announceRankChange, type RankSnapshot } from "@/lib/rank-events";

type WorkoutLog = {
  id: string;
  exercise: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  loggedAt: string;
};

const QUICK_PICKS = ["Squat", "Bench press", "Deadlift", "Overhead press", "Pull-up", "Treadmill"];

export default function WorkoutsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ exercise: "", sets: "", reps: "", weightKg: "" });

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/workouts", { cache: "no-store" });
      if (res.ok) setLogs((await res.json()) as WorkoutLog[]);
      else if (res.status === 401) setError("Your session expired — log in again.");
    } catch {
      setError("Could not load your workouts.");
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

    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        exercise: form.exercise,
        sets: form.sets,
        reps: form.reps,
        weightKg: form.weightKg || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not save that workout.");
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { rank?: RankSnapshot }
      | null;

    setForm({ exercise: "", sets: "", reps: "", weightKg: "" });
    setMessage(
      data?.rank
        ? logConfirmation(data.rank as RankProgress, data.rank.streak)
        : "Workout logged.",
    );
    if (data?.rank) announceRankChange(data.rank);
    router.refresh();
    void loadLogs();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this workout log?")) return;
    const res = await fetch(`/api/workouts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { rank?: RankSnapshot } | null;
      if (data?.rank) announceRankChange(data.rank);
      router.refresh();
      void loadLogs();
    } else {
      setError("Could not delete that log.");
    }
  }

  const totalVolume = logs.reduce(
    (sum, log) => sum + (log.weightKg ?? 0) * log.sets * log.reps,
    0,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Training</p>
        <h1 className="mt-2 text-3xl font-semibold">Workout log</h1>
        <p className="mt-2 text-sm text-muted">
          Every session you log keeps your streak alive and feeds your rank.
        </p>
      </header>

      <RankLive />

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label" htmlFor="exercise">Exercise</label>
          <input
            id="exercise"
            className="input"
            placeholder="e.g. Bench press"
            value={form.exercise}
            onChange={(event) => setForm({ ...form, exercise: event.target.value })}
            required
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick}
                type="button"
                onClick={() => setForm({ ...form, exercise: pick })}
                className="tag hover:border-gold/50 hover:text-goldSoft"
              >
                {pick}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="sets">Sets</label>
            <input
              id="sets"
              type="number"
              min={1}
              max={100}
              className="input"
              placeholder="4"
              value={form.sets}
              onChange={(event) => setForm({ ...form, sets: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="reps">Reps</label>
            <input
              id="reps"
              type="number"
              min={1}
              max={1000}
              className="input"
              placeholder="8"
              value={form.reps}
              onChange={(event) => setForm({ ...form, reps: event.target.value })}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="weight">Weight (kg)</label>
            <input
              id="weight"
              type="number"
              min={0}
              step="0.5"
              className="input"
              placeholder="70"
              value={form.weightKg}
              onChange={(event) => setForm({ ...form, weightKg: event.target.value })}
            />
          </div>
        </div>

        {error && <p className="alert-error">{error}</p>}
        {message && <p className="alert-success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Log workout"}
        </button>
      </form>

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">Recent sessions</h2>
          <span className="text-xs text-muted">
            {logs.length} logged · {Math.round(totalVolume).toLocaleString("en-NG")} kg volume
          </span>
        </div>

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
          {loading && <li className="px-5 py-6 text-sm text-muted">Loading…</li>}
          {!loading && logs.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">
              No workouts yet. Log your first session above.
            </li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">{log.exercise}</p>
                <p className="text-xs text-muted">
                  {log.sets} × {log.reps}
                  {log.weightKg ? ` @ ${log.weightKg}kg` : ""} ·{" "}
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
                aria-label={`Delete ${log.exercise}`}
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
