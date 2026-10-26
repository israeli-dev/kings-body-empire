import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Back to site
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <footer className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Kings Body Empire
      </footer>
    </div>
  );
}
