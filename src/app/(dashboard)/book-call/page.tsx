"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Slot = { id: string; startTime: string; endTime: string };
type Booking = { id: string; slot: Slot };

export default function BookCallPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [slots, setSlots] = useState<Slot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadSlots() {
    const res = await fetch("/api/availability");
    if (res.ok) setSlots(await res.json());
  }
  async function loadBookings() {
    const res = await fetch("/api/bookings");
    if (res.ok) setMyBookings(await res.json());
  }
  useEffect(() => { loadSlots(); loadBookings(); }, []);

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startTime: start, endTime: end }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setStart(""); setEnd("");
    loadSlots();
  }

  async function handleBook(slotId: string) {
    setError(""); setMessage("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setMessage("Call booked!");
    loadSlots();
    loadBookings();
  }

  return (
    <main style={{ maxWidth: 640, margin: "40px auto", padding: 24 }}>
      <h1>Book a Fitness Call</h1>

      {isAdmin && (
        <section style={{ marginTop: 24, padding: 16, border: "1px solid #333" }}>
          <h2 style={{ fontSize: 16 }}>Add availability (admin)</h2>
          <form onSubmit={handleAddSlot} style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} required />
            <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} required />
            <button type="submit">Add slot</button>
          </form>
        </section>
      )}

      {error && <p style={{ color: "red", marginTop: 16 }}>{error}</p>}
      {message && <p style={{ color: "limegreen", marginTop: 16 }}>{message}</p>}

      <h2 style={{ marginTop: 32 }}>Available times</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {slots.map((slot) => (
          <li key={slot.id} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #333", padding: "10px 0" }}>
            <span>{new Date(slot.startTime).toLocaleString()} – {new Date(slot.endTime).toLocaleTimeString()}</span>
            <button onClick={() => handleBook(slot.id)}>Book</button>
          </li>
        ))}
        {slots.length === 0 && <p style={{ color: "#999" }}>No open slots right now — check back soon.</p>}
      </ul>

      <h2 style={{ marginTop: 32 }}>Your bookings</h2>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 10 }}>
        {myBookings.map((b) => (
          <li key={b.id} style={{ borderBottom: "1px solid #333", padding: "10px 0" }}>
            {new Date(b.slot.startTime).toLocaleString()}
          </li>
        ))}
        {myBookings.length === 0 && <p style={{ color: "#999" }}>No calls booked yet.</p>}
      </ul>
    </main>
  );
}
