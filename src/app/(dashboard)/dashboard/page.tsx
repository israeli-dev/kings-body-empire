import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RankBadge } from "@/components/rank-badge";
import { getCurrentUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { getRankOverview } from "@/lib/rank";
import { dayKey } from "@/lib/rank-core";
import { formatNaira } from "@/lib/money";
import type { RankName } from "@/types";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fdashboard");

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);

  const [
    overview,
    workouts,
    foods,
    measurements,
    nextBooking,
    packagePurchases,
    bookPurchases,
    recentWorkouts,
    recentFoods,
  ] = await Promise.all([
    getRankOverview(user.id),
    prisma.workoutLog.findMany({
      where: { userId: user.id, loggedAt: { gte: weekAgo } },
      select: { loggedAt: true },
    }),
    prisma.foodLog.findMany({
      where: { userId: user.id, loggedAt: { gte: weekAgo } },
      select: { loggedAt: true },
    }),
    prisma.measurementLog.findMany({
      where: { userId: user.id, loggedAt: { gte: weekAgo } },
      select: { loggedAt: true },
    }),
    prisma.callBooking.findFirst({
      where: { userId: user.id, slot: { startTime: { gte: now } } },
      include: { slot: true },
      orderBy: { slot: { startTime: "asc" } },
    }),
    prisma.packagePurchase.findMany({
      where: { userId: user.id, status: "PAID" },
      include: { package: { select: { title: true, durationWeeks: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bookPurchase.findMany({
      where: { userId: user.id, status: "PAID" },
      include: { book: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.workoutLog.findMany({
      where: { userId: user.id },
      orderBy: { loggedAt: "desc" },
      take: 4,
    }),
    prisma.foodLog.findMany({
      where: { userId: user.id },
      orderBy: { loggedAt: "desc" },
      take: 4,
    }),
  ]);

  const activeDayKeys = new Set(
    [...workouts, ...foods, ...measurements].map((log) => dayKey(log.loggedAt)),
  );

  const lastSevenDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now.getTime() - (6 - index) * DAY_MS);
    return {
      key: dayKey(date),
      label: date.toLocaleDateString("en-NG", { weekday: "narrow", timeZone: "UTC" }),
      active: activeDayKeys.has(dayKey(date)),
    };
  });

  const recentActivity = [
    ...recentWorkouts.map((log) => ({
      id: `w-${log.id}`,
      at: log.loggedAt,
      title: log.exercise,
      detail: `${log.sets} × ${log.reps}${log.weightKg ? ` @ ${log.weightKg}kg` : ""}`,
      kind: "Workout",
    })),
    ...recentFoods.map((log) => ({
      id: `f-${log.id}`,
      at: log.loggedAt,
      title: log.description,
      detail: log.calories ? `${log.calories} kcal` : "—",
      kind: "Food",
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  const progressPercent = Math.min(100, Math.round((overview.activeDays / 7) * 100));
  const firstName = (user.name || "").split(" ")[0] || "there";
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold">Welcome back, {firstName}</h1>
          <p className="mt-2 text-sm text-muted">
            {overview.streak > 0
              ? `${overview.streak}-day streak. Keep it going.`
              : "Log something today to start a streak."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RankBadge rank={(user.rank as RankName) ?? overview.rank} />
          {isAdmin && (
            <Link href="/admin" className="btn-secondary btn-sm">Admin</Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Rank card */}
        <section className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Consistency rank</p>
              <h2 className="mt-1 text-2xl font-semibold">{overview.rank}</h2>
            </div>
            <span className="text-3xl" aria-hidden="true">♛</span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>{overview.activeDays} of 7 active days</span>
              <span>
                {overview.atTopRank
                  ? "Top rank reached"
                  : `${overview.daysToNextRank} day${overview.daysToNextRank === 1 ? "" : "s"} to ${overview.nextRank}`}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-panel2">
              <div
                className="h-full rounded-full bg-gold-fade"
                style={{ width: `${Math.max(progressPercent, 3)}%` }}
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-7 gap-2">
            {lastSevenDays.map((day) => (
              <div key={day.key} className="text-center">
                <div
                  className={`flex h-10 items-center justify-center rounded-lg border text-sm ${
                    day.active
                      ? "border-gold/40 bg-gold/15 text-goldSoft"
                      : "border-line bg-panel2 text-muted/50"
                  }`}
                >
                  {day.active ? "✓" : "·"}
                </div>
                <span className="mt-1 block text-[10px] uppercase text-muted">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Quick actions */}
        <section className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Log something
          </h2>
          <div className="mt-4 grid gap-2">
            <Link href="/workouts" className="btn-secondary justify-between">
              <span>🏋️ Workout</span>
              <span className="text-muted">{workouts.length} this week</span>
            </Link>
            <Link href="/food" className="btn-secondary justify-between">
              <span>🥗 Food</span>
              <span className="text-muted">{foods.length} this week</span>
            </Link>
            <Link href="/measurements" className="btn-secondary justify-between">
              <span>📏 Measurements</span>
              <span className="text-muted">{measurements.length} this week</span>
            </Link>
            <Link href="/book-call" className="btn-primary justify-between">
              <span>📞 Book a call</span>
              <span>→</span>
            </Link>
          </div>
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent activity</h2>
            <Link href="/workouts" className="text-sm text-gold hover:text-goldSoft">
              View all
            </Link>
          </div>

          <ul className="mt-4 divide-y divide-line">
            {recentActivity.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.kind} · {item.at.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                <span className="text-sm text-muted">{item.detail}</span>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <li className="py-6 text-sm text-muted">
                Nothing logged yet. Start with today&apos;s workout.
              </li>
            )}
          </ul>
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold">Upcoming</h2>

          <div className="mt-4 rounded-xl border border-line bg-panel2 p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Next coach call</p>
            {nextBooking ? (
              <p className="mt-1 text-sm font-medium">
                {nextBooking.slot.startTime.toLocaleString("en-NG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Nothing booked yet.</p>
                <Link href="/book-call" className="btn-secondary btn-sm mt-3">
                  Book a slot
                </Link>
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-panel2 p-4">
            <p className="text-xs uppercase tracking-wider text-muted">Your programs</p>
            {packagePurchases.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {packagePurchases.map((purchase) => (
                  <li key={purchase.id}>
                    {purchase.package.title}{" "}
                    <span className="text-xs text-muted">
                      · {purchase.package.durationWeeks} weeks
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">No program yet.</p>
                <Link href="/pricing" className="btn-secondary btn-sm mt-3">
                  Browse programs
                </Link>
              </>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-panel2 p-4">
            <p className="text-xs uppercase tracking-wider text-muted">E-books owned</p>
            {bookPurchases.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm">
                {bookPurchases.map((purchase) => (
                  <li key={purchase.id}>
                    <Link href={`/books/${purchase.book.slug}`} className="hover:text-gold">
                      {purchase.book.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted">None yet.</p>
            )}
          </div>
        </section>
      </div>

      {packagePurchases.length === 0 && (
        <section className="card flex flex-wrap items-center justify-between gap-4 border-gold/25">
          <div>
            <h2 className="text-lg font-semibold">Ready for a structured plan?</h2>
            <p className="mt-1 text-sm text-muted">
              Programs from {formatNaira(2_500_000)} — training, food templates and check-ins.
            </p>
          </div>
          <Link href="/pricing" className="btn-primary">See programs</Link>
        </section>
      )}
    </div>
  );
}
