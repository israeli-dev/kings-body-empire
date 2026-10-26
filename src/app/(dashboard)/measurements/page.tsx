"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RankLive } from "@/components/rank-live";
import { logConfirmation, type RankProgress } from "@/lib/rank-core";
import { announceRankChange, type RankSnapshot } from "@/lib/rank-events";

type MeasurementLog = {
  id: string;
  weightKg: number | null;
  heightCm: number | null;
  waistCm: number | null;
  shoulderCm: number | null;
  chestCm: number | null;
  armCm: number | null;
  loggedAt: string;
};

type Field = "weightKg" | "heightCm" | "waistCm" | "shoulderCm" | "chestCm" | "armCm";

const FIELDS: { key: Field; label: string; hint: string }[] = [
  { key: "weightKg", label: "Weight", hint: "kg" },
  { key: "heightCm", label: "Height", hint: "cm" },
  { key: "waistCm", label: "Waist", hint: "cm" },
  { key: "shoulderCm", label: "Shoulders", hint: "cm" },
  { key: "chestCm", label: "Chest", hint: "cm" },
  { key: "armCm", label: "Arm", hint: "cm" },
];

const EMPTY_FORM: Record<Field, string> = {
  weightKg: "",
  heightCm: "",
  waistCm: "",
  shoulderCm: "",
  chestCm: "",
  armCm: "",
};

export default function MeasurementsPage() {
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const [form, setForm] = useState<Record<Field, string>>(EMPTY_FORM);

  const loadLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/measurements", { cache: "no-store" });
      if (res.ok) setLogs((await res.json()) as MeasurementLog[]);
      else if (res.status === 401) setError("Your session expired — log in again.");
    } catch {
      setError("Could not load your measurements.");
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

    if (!FIELDS.some((field) => form[field.key].trim() !== "")) {
      setError("Fill in at least one measurement.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not save those measurements.");
      return;
    }

    const data = (await res.json().catch(() => null)) as { rank?: RankSnapshot } | null;

    setForm(EMPTY_FORM);
    setMessage(
      data?.rank
        ? logConfirmation(data.rank as RankProgress, data.rank.streak)
        : "Measurements saved.",
    );
    if (data?.rank) announceRankChange(data.rank);
    router.refresh();
    void loadLogs();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this measurement entry?")) return;
    const res = await fetch(`/api/measurements?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as { rank?: RankSnapshot } | null;
      if (data?.rank) announceRankChange(data.rank);
      router.refresh();
      void loadLogs();
    } else {
      setError("Could not delete that entry.");
    }
  }

  const latest = logs[0];
  const previous = logs[1];

  function delta(key: Field) {
    if (!latest || !previous) return null;
    const now = latest[key];
    const before = previous[key];
    if (now === null || before === null) return null;
    const change = Math.round((now - before) * 10) / 10;
    if (change === 0) return null;
    return change;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Progress</p>
        <h1 className="mt-2 text-3xl font-semibold">Body measurements</h1>
        <p className="mt-2 text-sm text-muted">
          The tape measure tells the truth the scale hides. Log monthly, or weekly.
        </p>
      </header>

      <RankLive />

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FIELDS.map((field) => (
            <div key={field.key}>
              <label className="label" htmlFor={field.key}>
                {field.label} <span className="text-muted/70">({field.hint})</span>
              </label>
              <input
                id={field.key}
                type="number"
                min={0}
                max={500}
                step="0.1"
                className="input"
                value={form[field.key]}
                onChange={(event) => setForm({ ...form, [field.key]: event.target.value })}
              />
            </div>
          ))}
        </div>

        {error && <p className="alert-error">{error}</p>}
        {message && <p className="alert-success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving…" : "Save measurements"}
        </button>
      </form>

      {latest && (
        <section className="grid gap-3 sm:grid-cols-3">
          {FIELDS.filter((field) => latest[field.key] !== null).map((field) => {
            const change = delta(field.key);
            return (
              <div key={field.key} className="card-tight">
                <p className="text-xs uppercase tracking-wider text-muted">{field.label}</p>
                <p className="mt-1 text-xl font-semibold">
                  {latest[field.key]} <span className="text-sm text-muted">{field.hint}</span>
                </p>
                {change !== null && (
                  <p className={`mt-1 text-xs ${change < 0 ? "text-success" : "text-gold"}`}>
                    {change > 0 ? "+" : ""}
                    {change} {field.hint} vs previous
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section>
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-lg font-semibold">History</h2>
          <span className="text-xs text-muted">{logs.length} entries</span>
        </div>

        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
          {loading && <li className="px-5 py-6 text-sm text-muted">Loading…</li>}
          {!loading && logs.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">No measurements yet.</li>
          )}
          {logs.map((log) => (
            <li key={log.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm">
                  {[
                    log.weightKg !== null ? `${log.weightKg}kg` : null,
                    log.waistCm !== null ? `waist ${log.waistCm}cm` : null,
                    log.chestCm !== null ? `chest ${log.chestCm}cm` : null,
                    log.armCm !== null ? `arm ${log.armCm}cm` : null,
                    log.shoulderCm !== null ? `shoulders ${log.shoulderCm}cm` : null,
                    log.heightCm !== null ? `height ${log.heightCm}cm` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <p className="text-xs text-muted">
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
