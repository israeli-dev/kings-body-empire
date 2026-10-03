"use client";
import { useEffect, useState } from "react";

type MeasurementLog = {
  id: string; weightKg: number | null; heightCm: number | null; waistCm: number | null;
  shoulderCm: number | null; chestCm: number | null; armCm: number | null; loggedAt: string;
};

export default function MeasurementsPage() {
  const [logs, setLogs] = useState<MeasurementLog[]>([]);
  const [form, setForm] = useState({ weightKg: "", heightCm: "", waistCm: "", shoulderCm: "", chestCm: "", armCm: "" });
  const [error, setError] = useState("");

  async function loadLogs() {
    const res = await fetch("/api/measurements");
    if (res.ok) setLogs(await res.json());
  }
  useEffect(() => { loadLogs(); }, []);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setForm({ weightKg: "", heightCm: "", waistCm: "", shoulderCm: "", chestCm: "", armCm: "" });
    loadLogs();
  }

  const fields: [keyof typeof form, string][] = [
    ["weightKg", "Weight (kg)"], ["heightCm", "Height (cm)"], ["waistCm", "Waist (cm)"],
    ["shoulderCm", "Shoulder (cm)"], ["chestCm", "Chest (cm)"], ["armCm", "Arm (cm)"],
  ];

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <h1>Body Measurements</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 }}>
        {fields.map(([key, label]) => (
          <input key={key} placeholder={label} type="number" value={form[key]} onChange={(e) => update(key, e.target.value)} />
        ))}
        {error && <p style={{ color: "red", gridColumn: "1 / -1" }}>{error}</p>}
        <button type="submit" style={{ gridColumn: "1 / -1" }}>Log measurements</button>
      </form>

      <h2 style={{ marginTop: 40 }}>History</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {logs.map((log) => (
          <li key={log.id} style={{ borderBottom: "1px solid #333", padding: "10px 0" }}>
            {log.weightKg ? `${log.weightKg}kg` : ""}{log.waistCm ? ` · Waist ${log.waistCm}cm` : ""}{log.chestCm ? ` · Chest ${log.chestCm}cm` : ""}{log.armCm ? ` · Arm ${log.armCm}cm` : ""}
            <div style={{ fontSize: 12, color: "#999" }}>{new Date(log.loggedAt).toLocaleString()}</div>
          </li>
        ))}
        {logs.length === 0 && <p style={{ color: "#999" }}>No measurements logged yet.</p>}
      </ul>
    </main>
  );
}
