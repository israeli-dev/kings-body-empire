import type { Metadata } from "next";
import Link from "next/link";
import { BuyButton } from "@/components/buy-button";
import { getCurrentUser } from "@/lib/api";
import { paymentsEnabled } from "@/lib/env";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Programs",
  description:
    "Coaching programs from 4 to 12 weeks: training plan, food templates, check-ins and direct coach access.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getCurrentUser();

  const [packages, ownedIds] = await Promise.all([
    prisma.package.findMany({
      where: { isActive: true },
      orderBy: { priceKobo: "asc" },
    }),
    user
      ? prisma.packagePurchase
          .findMany({ where: { userId: user.id, status: "PAID" }, select: { packageId: true } })
          .then((rows) => rows.map((row) => row.packageId))
      : Promise.resolve<string[]>([]),
  ]);

  const paymentsOn = paymentsEnabled();

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Programs</p>
        <h1 className="mt-3 text-4xl font-semibold">Pick the level you are at</h1>
        <p className="mt-4 text-sm text-muted">
          Every program includes a training plan, a food template built around Nigerian meals
          and weekly check-ins. Pay once in naira — no subscriptions, no hidden renewals.
        </p>
      </div>

      {!paymentsOn && (
        <p className="alert-info mt-8">
          Payments are not configured on this deployment yet. Add{" "}
          <code className="text-gold">PAYSTACK_SECRET_KEY</code> and{" "}
          <code className="text-gold">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code> to your{" "}
          <code>.env</code> file to enable checkout.
        </p>
      )}

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {packages.map((pkg, index) => {
          const owned = ownedIds.includes(pkg.id);
          const featured = index === 1;

          return (
            <article
              key={pkg.id}
              className={`card flex flex-col ${featured ? "border-gold/40 shadow-glow" : ""}`}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">{pkg.title}</h2>
                <span className="tag">{pkg.durationWeeks} weeks</span>
              </div>

              {featured && (
                <span className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-gold">
                  Most popular
                </span>
              )}

              <p className="mt-4 text-sm text-muted">{pkg.description}</p>

              <p className="mt-6 text-3xl font-semibold text-gold">
                {formatNaira(pkg.priceKobo)}
              </p>

              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {pkg.contents.map((item) => (
                  <li key={item} className="flex gap-2 text-muted">
                    <span className="text-gold" aria-hidden="true">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <BuyButton
                  itemType="package"
                  itemId={pkg.id}
                  price={formatNaira(pkg.priceKobo)}
                  signedIn={Boolean(user)}
                  owned={owned}
                  ownedHref="/dashboard"
                  className={featured ? "btn-primary w-full" : "btn-secondary w-full"}
                />
              </div>
            </article>
          );
        })}
      </div>

      {packages.length === 0 && (
        <p className="card mt-10 text-sm text-muted">
          No programs published yet. Seed the database with{" "}
          <code className="text-gold">npm run db:seed</code> to get the starter catalogue.
        </p>
      )}

      <section className="card mt-12">
        <h2 className="text-lg font-semibold">Not ready to buy?</h2>
        <p className="mt-2 text-sm text-muted">
          Logging is free forever. Start an account, build the habit, then add a program when
          you want the plan handed to you.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={user ? "/dashboard" : "/signup"} className="btn-primary">
            {user ? "Go to dashboard" : "Create a free account"}
          </Link>
          <Link href="/books" className="btn-secondary">Browse e-books</Link>
        </div>
      </section>
    </div>
  );
}
