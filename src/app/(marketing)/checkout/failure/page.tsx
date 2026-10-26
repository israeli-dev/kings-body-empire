import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment not completed" };

const REASONS: Record<string, string> = {
  "missing-reference": "Paystack did not send a transaction reference.",
  "payments-off": "Payments are not configured on this deployment.",
  "unknown-reference": "We could not find that transaction. Log in with the account you paid from.",
  verify: "We could not verify the payment with Paystack. If you were charged, email the coach with your reference.",
  unsuccessful: "Paystack reported that the payment did not go through.",
};

export default function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: { reason?: string; ref?: string };
}) {
  const reason = searchParams.reason ?? "";
  const message =
    REASONS[reason] ??
    "That payment did not complete. Nothing was unlocked and you were not charged twice.";

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg text-center">
        <span className="text-4xl" aria-hidden="true">⚠️</span>
        <h1 className="mt-4 text-2xl font-semibold">Payment not completed</h1>
        <p className="mt-2 text-sm text-muted">{message}</p>
        {searchParams.ref && (
          <p className="mt-3 text-xs text-muted">
            Reference: <code className="text-gold">{searchParams.ref}</code>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/pricing" className="btn-primary">Try again</Link>
          <Link href="/dashboard" className="btn-secondary">Go to dashboard</Link>
        </div>
      </div>
    </div>
  );
}
