import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="card max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-2xl font-semibold">This page does not exist</h1>
        <p className="mt-2 text-sm text-muted">
          The link may be old, or the page may have moved.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href="/" className="btn-primary">Back home</Link>
          <Link href="/dashboard" className="btn-secondary">Dashboard</Link>
        </div>
      </div>
    </div>
  );
}
