import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-hidden">
      {/* Background photograph (shared by /login, /signup and /forgot-password) */}
      <Image
        src="/images/auth-bg.jpg"
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover object-[58%_center] sm:object-center"
      />
      {/* Overlays: heavy at the centre/left where the card sits, lighter at the edges */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-bg/80 sm:bg-gradient-to-r sm:from-bg sm:via-bg/85 sm:to-bg/45"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-bg via-bg/30 to-bg/70"
      />

      <header className="border-b border-white/10">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Back to site
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          {children}

          <p className="mt-6 text-center text-xs text-muted">
            Train. Eat. Track. Transform.
          </p>
        </div>
      </main>

      <footer className="border-t border-white/10 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Kings Body Empire
      </footer>
    </div>
  );
}
