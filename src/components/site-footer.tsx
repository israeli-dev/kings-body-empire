import Link from "next/link";
import { instagramUrl, supportEmail, whatsappUrl } from "@/lib/env";
import { CrownMark } from "./logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-panel/60">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <CrownMark className="h-6 w-6" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Kings Body Empire</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            Train. Eat. Track. Transform. Coaching built for real life.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Explore</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/pricing" className="hover:text-ink">Programs</Link></li>
            <li><Link href="/books" className="hover:text-ink">E-books</Link></li>
            <li><Link href="/signup" className="hover:text-ink">Create account</Link></li>
            <li><Link href="/login" className="hover:text-ink">Log in</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Account</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link href="/dashboard" className="hover:text-ink">Dashboard</Link></li>
            <li><Link href="/book-call" className="hover:text-ink">Book a call</Link></li>
            <li><Link href="/education" className="hover:text-ink">Education library</Link></li>
            <li><Link href="/measurements" className="hover:text-ink">Measurements</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gold">Contact</h3>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={`mailto:${supportEmail}`} className="hover:text-ink">{supportEmail}</a>
            </li>
            {whatsappUrl && (
              <li>
                <a href={whatsappUrl} className="hover:text-ink" target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              </li>
            )}
            {instagramUrl && (
              <li>
                <a href={instagramUrl} className="hover:text-ink" target="_blank" rel="noreferrer">
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Kings Body Empire. All rights reserved.</p>
          <p>Lagos, Nigeria · Payments secured by Paystack</p>
        </div>
      </div>
    </footer>
  );
}
