import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-password-form";
import { isWellFormedResetToken } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage({ params }: { params: { token: string } }) {
  // Cheap shape check; the real validation (hash, expiry, single use) happens
  // on the server when the form is submitted.
  if (!isWellFormedResetToken(params.token)) {
    return (
      <div className="card text-center">
        <span className="text-3xl" aria-hidden="true">⚠️</span>
        <h1 className="mt-3 text-2xl font-semibold">That link looks broken</h1>
        <p className="mt-2 text-sm text-muted">
          Reset links are long and easy to cut in half. Request a fresh one and use
          the button in the email.
        </p>
        <Link href="/forgot-password" className="btn-primary mt-6">
          Request a new link
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={params.token} />;
}
