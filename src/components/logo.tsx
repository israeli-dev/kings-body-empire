import Link from "next/link";

export function CrownMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id="kbe-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFD978" />
          <stop offset="55%" stopColor="#F5B301" />
          <stop offset="100%" stopColor="#C08700" />
        </linearGradient>
      </defs>
      <path
        d="M4 24.5 5.9 9.8l6.4 5.4L16 6.8l3.7 8.4 6.4-5.4L28 24.5H4Z"
        fill="url(#kbe-gold)"
      />
      <rect x="4" y="25.8" width="24" height="2.6" rx="1.3" fill="url(#kbe-gold)" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="Kings Body Empire home">
      <CrownMark />
      <span className="text-sm font-bold uppercase leading-tight tracking-[0.18em] text-ink">
        Kings Body
        <span className="block text-[10px] font-medium tracking-[0.32em] text-gold">Empire</span>
      </span>
    </Link>
  );
}
