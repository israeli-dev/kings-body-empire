"use client";
import { useEffect, useState } from "react";

type FoodLog = { id: string; description: string; calories: number | null; loggedAt: string };

export default function FoodPage() {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [error, setError] = useState("");

  async function loadLogs() {
    const res = await fetch("/api/food");
    if (res.ok) setLogs(await res.json());
  }
  useEffect(() => { loadLogs(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/food", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description, calories: calories || undefined }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setDescription(""); setCalories("");
    loadLogs();
  }

  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 24 }}>
      <h1>Food Log</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 10, marginTop: 20 }}>
        <input placeholder="What did you eat?" value={description} onChange={(e) => setDescription(e.target.value)} required />
        <input placeholder="Calories (optional)" type="number" value={calories} onChange={(e) => setCalories(e.target.value)} />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit">Log food</button>
      </form>

      <h2 style={{ marginTop: 40 }}>Recently logged</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {logs.map((log) => (
          <li key={log.id} style={{ borderBottom: "1px solid #333", padding: "10px 0" }}>
            {log.description}{log.calories ? ` — ${log.calories} kcal` : ""}
            <div style={{ fontSize: 12, color: "#999" }}>{new Date(log.loggedAt).toLocaleString()}</div>
          </li>
        ))}
        {logs.length === 0 && <p style={{ color: "#999" }}>No food logged yet.</p>}
      </ul>
    </main>
  );
}
