"use client";
import { useEffect, useState } from "react";

type WorkoutLog = { id: string; exercise: string; sets: number; reps: number; weightKg: number | null; loggedAt: string };

export default function WorkoutsPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [exercise, setExercise] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [error, setError] = useState("");

  async function loadLogs() {
    const res = await fetch("/api/workouts");
    if (res.ok) setLogs(await res.json());
  }
  useEffect(() => { loadLogs(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exercise, sets, reps, weightKg: weightKg || undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setExercise(""); setSets(""); setReps(""); setWeightKg("");
    loadLogs();
  }

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <h1>Workout Log</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <input placeholder="Exercise (e.g. Bench Press)" value={exercise} onChange={(e) => setExercise(e.target.value)} required />
        <div style={{ display: "flex", gap: 10 }}>
          <input placeholder="Sets" type="number" value={sets} onChange={(e) => setSets(e.target.value)} required style={{ flex: 1 }} />
          <input placeholder="Reps" type="number" value={reps} onChange={(e) => setReps(e.target.value)} required style={{ flex: 1 }} />
          <input placeholder="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} style={{ flex: 1 }} />
        </div>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log workout</button>
      </form>

      <h2 style={{ marginTop: 40 }}>Recent sessions</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {logs.map((log) => (
          <li key={log.id} style={{ borderBottom: "1px solid #333", padding: "10px 0" }}>
            <strong>{log.exercise}</strong> — {log.sets}×{log.reps}{log.weightKg ? ` @ ${log.weightKg}kg` : ""}
            <div style={{ fontSize: 12, color: "#999" }}>{new Date(log.loggedAt).toLocaleString()}</div>
          </li>
        ))}
        {logs.length === 0 && <p style={{ color: "#999" }}>No workouts logged yet.</p>}
      </ul>
    </main>
  );
}
