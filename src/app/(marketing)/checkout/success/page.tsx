import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment successful" };

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { kind?: string; title?: string };
}) {
  const isPackage = searchParams.kind === "package";
  const title = searchParams.title ?? null;

  return (
    <div className="container-page flex min-h-[60vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg text-center">
        <span className="text-4xl" aria-hidden="true">🎉</span>
        <h1 className="mt-4 text-2xl font-semibold">Payment confirmed</h1>
        <p className="mt-2 text-sm text-muted">
          {title ? (
            <>
              You now have <span className="text-ink">{title}</span>.{" "}
            </>
          ) : (
            "Your purchase went through. "
          )}
          {isPackage
            ? "Your coach will reach out within 24 hours to start onboarding."
            : "Open the e-book from your dashboard whenever you need it."}
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href="/dashboard" className="btn-primary">Go to dashboard</Link>
          {isPackage ? (
            <Link href="/book-call" className="btn-secondary">Book your onboarding call</Link>
          ) : (
            <Link href="/books" className="btn-secondary">Browse more e-books</Link>
          )}
        </div>
      </div>
    </div>
  );
}
