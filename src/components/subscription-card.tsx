"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatNaira } from "@/lib/money";
import type { SubscriptionView } from "@/lib/subscriptions";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    dateStyle: "medium",
    timeZone: "Africa/Lagos",
  });
}

const TONE_CLASSES: Record<string, string> = {
  success: "border-success/40 bg-success/10 text-success",
  warning: "border-gold/40 bg-gold/10 text-goldSoft",
  danger: "border-danger/40 bg-danger/10 text-danger",
  muted: "border-line bg-panel2 text-muted",
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionView }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"cancel" | "reactivate" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  async function update(action: "cancel" | "reactivate") {
    setError("");
    setNote("");
    setLoading(action);

    try {
      const res = await fetch("/api/subscriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subscription.id, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error || "Could not update that subscription.");
        setLoading(null);
        return;
      }

      setNote(data.message ?? "Updated.");
      router.refresh();
      setLoading(null);
    } catch {
      setError("Could not reach the server. Check your connection.");
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{subscription.packageTitle}</p>
          <p className="mt-0.5 text-xs text-muted">
            {formatNaira(subscription.amountKobo)}/month · {formatDate(subscription.currentPeriodEnd)}{" "}
            {subscription.status === "ACTIVE" ? "next charge" : "access ends"}
          </p>
        </div>
        <span
          className={`tag border ${TONE_CLASSES[subscription.tone] ?? TONE_CLASSES.muted}`}
        >
          {subscription.statusLabel}
        </span>
      </div>

      <p className="mt-2 text-xs text-muted">{subscription.summary}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {subscription.canCancel && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => update("cancel")}
            disabled={loading !== null}
          >
            {loading === "cancel" ? "Stopping…" : "Cancel subscription"}
          </button>
        )}
        {subscription.canReactivate && (
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => update("reactivate")}
            disabled={loading !== null}
          >
            {loading === "reactivate" ? "Restarting…" : "Keep billing"}
          </button>
        )}
      </div>

      {subscription.canCancel && (
        <p className="mt-2 text-[11px] leading-relaxed text-muted/80">
          Cancelling stops the next charge. You keep the program until{" "}
          {formatDate(subscription.currentPeriodEnd)}.
        </p>
      )}

      {error && <p className="alert-error mt-2">{error}</p>}
      {note && <p className="alert-success mt-2">{note}</p>}
    </div>
  );
}
