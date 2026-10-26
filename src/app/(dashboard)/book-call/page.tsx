"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type Slot = { id: string; startTime: string; endTime: string };
type Booking = {
  id: string;
  phone: string | null;
  notes: string | null;
  slot: Slot;
  user?: { name: string; email: string };
};

function formatSlot(slot: Slot) {
  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);
  return `${start.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  })} – ${end.toLocaleTimeString("en-NG", { timeStyle: "short" })}`;
}

export default function BookCallPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const loadSlots = useCallback(async () => {
    const res = await fetch("/api/availability", { cache: "no-store" });
    if (res.ok) setSlots((await res.json()) as Slot[]);
  }, []);

  const loadBookings = useCallback(async () => {
    const res = await fetch("/api/bookings", { cache: "no-store" });
    if (res.ok) setBookings((await res.json()) as Booking[]);
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([loadSlots(), loadBookings()]);
      setLoading(false);
    })();
  }, [loadSlots, loadBookings]);

  async function handleAddSlot(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!start || !end) {
      setError("Pick both a start and an end time.");
      return;
    }

    setBusyKey("add-slot");

    // datetime-local is local time — convert to an absolute instant.
    const res = await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: new Date(start).toISOString(),
        endTime: new Date(end).toISOString(),
      }),
    });
    setBusyKey(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not add that slot.");
      return;
    }

    setStart("");
    setEnd("");
    setMessage("Slot added.");
    void loadSlots();
  }

  async function handleBook(slotId: string) {
    setError("");
    setMessage("");

    if (!phone.trim()) {
      setError("Add your phone number first so the coach can reach you.");
      return;
    }

    setBusyKey(slotId);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, phone, notes }),
    });
    setBusyKey(null);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not book that slot.");
      return;
    }

    setMessage("Call booked. The coach will ring you on that number.");
    setNotes("");
    void loadSlots();
    void loadBookings();
  }

  async function handleCancel(bookingId: string) {
    if (!window.confirm("Cancel this call? The slot goes back on the list.")) return;
    const res = await fetch(`/api/bookings?id=${bookingId}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Could not cancel that booking.");
      return;
    }
    setMessage("Booking cancelled.");
    void loadSlots();
    void loadBookings();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="eyebrow">Coaching</p>
        <h1 className="mt-2 text-3xl font-semibold">Book a fitness call</h1>
        <p className="mt-2 text-sm text-muted">
          A 30-minute video or phone call to review your training, food and next block.
        </p>
      </header>

      {isAdmin && (
        <form onSubmit={handleAddSlot} className="card space-y-4">
          <h2 className="text-lg font-semibold">Add availability (admin)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="slot-start">Starts</label>
              <input
                id="slot-start"
                type="datetime-local"
                className="input"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="slot-end">Ends</label>
              <input
                id="slot-end"
                type="datetime-local"
                className="input"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={busyKey === "add-slot"}>
            {busyKey === "add-slot" ? "Adding…" : "Add slot"}
          </button>
        </form>
      )}

      {!isAdmin && (
        <div className="card space-y-3">
          <div>
            <label className="label" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              className="input"
              placeholder="e.g. 0803 123 4567"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="notes">What should we cover? (optional)</label>
            <textarea
              id="notes"
              className="input min-h-[80px]"
              placeholder="Bulking plan, knee pain on squats, meal prep…"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
      )}

      {error && <p className="alert-error">{error}</p>}
      {message && <p className="alert-success">{message}</p>}

      <section>
        <h2 className="text-lg font-semibold">Available times</h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
          {loading && <li className="px-5 py-6 text-sm text-muted">Loading…</li>}
          {!loading && slots.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">
              No open slots right now — check back soon.
            </li>
          )}
          {slots.map((slot) => (
            <li key={slot.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <span className="text-sm">{formatSlot(slot)}</span>
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => handleBook(slot.id)}
                  className="btn-primary btn-sm"
                  disabled={busyKey === slot.id}
                >
                  {busyKey === slot.id ? "Booking…" : "Book"}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">
          {isAdmin ? "All calls" : "Your bookings"}
        </h2>
        <ul className="mt-4 divide-y divide-line rounded-2xl border border-line bg-panel">
          {!loading && bookings.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">
              {isAdmin ? "No calls booked yet." : "You have not booked a call yet."}
            </li>
          )}
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">{formatSlot(booking.slot)}</p>
                {isAdmin ? (
                  <p className="text-xs text-muted">
                    {booking.user?.name} · {booking.user?.email} ·{" "}
                    {booking.phone || "no phone given"}
                    {booking.notes ? ` · “${booking.notes}”` : ""}
                  </p>
                ) : (
                  <p className="text-xs text-muted">
                    {booking.phone || "no phone given"}
                    {booking.notes ? ` · “${booking.notes}”` : ""}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleCancel(booking.id)}
                className="btn-ghost btn-sm text-danger hover:text-danger"
              >
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
