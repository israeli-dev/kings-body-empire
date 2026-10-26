"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { PurchasableKind } from "@/types";

type Props = {
  itemType: PurchasableKind;
  itemId: string;
  price?: string;
  signedIn: boolean;
  owned?: boolean;
  ownedHref?: string;
  className?: string;
  /** "Subscribe" for monthly programs, "Buy" for one-off items and e-books. */
  verb?: string;
  ownedLabel?: string;
};

export function BuyButton({
  itemType,
  itemId,
  price,
  signedIn,
  owned = false,
  ownedHref,
  className = "btn-primary w-full",
  verb = "Buy",
  ownedLabel = "You own this — open",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <Link
        href={`/login?callbackUrl=${encodeURIComponent(pathname)}`}
        className={className}
      >
        Log in to {verb.toLowerCase()}
        {price ? ` · ${price}` : ""}
      </Link>
    );
  }

  if (owned) {
    return (
      <Link href={ownedHref ?? "/dashboard"} className="btn-secondary w-full">
        {ownedLabel}
      </Link>
    );
  }

  async function handleClick() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemType, itemId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        authorizationUrl?: string;
        alreadyOwned?: boolean;
        redirectUrl?: string;
      };

      if (!res.ok) {
        setError(data.error || "Could not start checkout. Please try again.");
        setLoading(false);
        return;
      }

      if (data.alreadyOwned) {
        router.push(data.redirectUrl || "/dashboard");
        return;
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
        return;
      }

      setError("Unexpected response from the payment provider.");
      setLoading(false);
    } catch {
      setError("Could not reach the server. Check your connection.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <button type="button" onClick={handleClick} className={className} disabled={loading}>
        {loading ? "Opening Paystack…" : `${verb}${price ? ` · ${price}` : ""}`}
      </button>
      {error && <p className="alert-error mt-2">{error}</p>}
    </div>
  );
}
