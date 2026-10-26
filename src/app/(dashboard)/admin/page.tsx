import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { subscriptionLabel } from "@/lib/subscription-core";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<string, string> = {
  PAID: "text-success",
  PENDING: "text-gold",
  FAILED: "text-danger",
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fadmin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [users, packagePurchases, bookPurchases, bookings, counts, subscriptions, activeSubscriptions, pastDueCount] = await Promise.all([
    prisma.user.count(),
    prisma.packagePurchase.findMany({
      include: {
        package: { select: { title: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.bookPurchase.findMany({
      include: {
        book: { select: { title: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.callBooking.findMany({
      include: { slot: true, user: { select: { name: true, email: true } } },
      orderBy: { slot: { startTime: "asc" } },
      take: 20,
    }),
    Promise.all([
      prisma.workoutLog.count(),
      prisma.foodLog.count(),
      prisma.educationContent.count(),
      prisma.package.count(),
      prisma.book.count(),
    ]),
    prisma.subscription.findMany({
      include: {
        package: { select: { title: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.subscription.findMany({
      where: { status: "ACTIVE" },
      select: { amountKobo: true },
    }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
  ]);

  const revenueKobo = [...packagePurchases, ...bookPurchases]
    .filter((purchase) => purchase.status === "PAID")
    .reduce((sum, purchase) => sum + purchase.amountKobo, 0);

  const [workoutCount, foodCount, lessonCount, packageCount, bookCount] = counts;
  // Every program is billed monthly, so "active" sums straight to MRR.
  const mrrKobo = activeSubscriptions.reduce(
    (sum: number, row: { amountKobo: number }) => sum + row.amountKobo,
    0,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Coach console</h1>
        <p className="mt-2 text-sm text-muted">
          Revenue, subscriptions, purchases and calls in one place. Lesson and slot management
          live on their own pages.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Clients", value: users.toString() },
          { label: "Revenue (paid)", value: formatNaira(revenueKobo) },
          { label: "Workout logs", value: workoutCount.toString() },
          { label: "Meals logged", value: foodCount.toString() },
          { label: "MRR (active)", value: formatNaira(mrrKobo) },
          { label: "Active subs", value: activeSubscriptions.length.toString() },
          {
            label: "Failed renewals",
            value: pastDueCount.toString(),
            danger: pastDueCount > 0,
          },
        ].map((stat) => (
          <div key={stat.label} className="card-tight">
            <p className="text-xs uppercase tracking-wider text-muted">{stat.label}</p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                "danger" in stat && stat.danger ? "text-danger" : ""
              }`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/education" className="btn-secondary btn-sm">Add a lesson</Link>
        <Link href="/book-call" className="btn-secondary btn-sm">Add availability</Link>
        <Link href="/pricing" className="btn-secondary btn-sm">View programs</Link>
        <span className="text-xs text-muted">
          {packageCount} programs · {bookCount} e-books · {lessonCount} lessons
        </span>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Subscriptions</h2>
        <p className="mt-1 text-xs text-muted">
          Programs renew monthly through Paystack. A price change starts a new plan — existing
          subscribers keep the amount they signed up at until they resubscribe.
        </p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Monthly</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Paid until</th>
                <th className="px-4 py-3">Next charge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {subscriptions.map((subscription) => (
                <tr key={subscription.id}>
                  <td className="px-4 py-3">
                    {subscription.user.name}
                    <span className="block text-xs text-muted">{subscription.user.email}</span>
                  </td>
                  <td className="px-4 py-3">{subscription.package.title}</td>
                  <td className="px-4 py-3">{formatNaira(subscription.amountKobo)}</td>
                  <td
                    className={`px-4 py-3 font-medium ${
                      subscription.status === "ACTIVE"
                        ? "text-success"
                        : subscription.status === "PAST_DUE"
                          ? "text-danger"
                          : "text-muted"
                    }`}
                  >
                    {subscriptionLabel(subscription.status)}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {subscription.currentPeriodEnd.toLocaleDateString("en-NG")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {subscription.nextPaymentDate?.toLocaleDateString("en-NG") ?? "—"}
                  </td>
                </tr>
              ))}
              {subscriptions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-muted">
                    No subscriptions yet. The first monthly checkout will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Program purchases</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Program</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {packagePurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-4 py-3">
                    {purchase.user.name}
                    <span className="block text-xs text-muted">{purchase.user.email}</span>
                  </td>
                  <td className="px-4 py-3">{purchase.package.title}</td>
                  <td className="px-4 py-3">{formatNaira(purchase.amountKobo)}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[purchase.status]}`}>
                    {purchase.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {purchase.createdAt.toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
              {packagePurchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">No program purchases yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">E-book purchases</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-panel">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bookPurchases.map((purchase) => (
                <tr key={purchase.id}>
                  <td className="px-4 py-3">
                    {purchase.user.name}
                    <span className="block text-xs text-muted">{purchase.user.email}</span>
                  </td>
                  <td className="px-4 py-3">{purchase.book.title}</td>
                  <td className="px-4 py-3">{formatNaira(purchase.amountKobo)}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[purchase.status]}`}>
                    {purchase.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {purchase.createdAt.toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
              {bookPurchases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-muted">No e-book purchases yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Calls</h2>
        <ul className="mt-3 divide-y divide-line rounded-2xl border border-line bg-panel">
          {bookings.map((booking) => (
            <li key={booking.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-sm font-medium">
                  {booking.slot.startTime.toLocaleString("en-NG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-xs text-muted">
                  {booking.user.name} · {booking.user.email} · {booking.phone || "no phone"}
                  {booking.notes ? ` · “${booking.notes}”` : ""}
                </p>
              </div>
              <span className="tag">
                {booking.slot.startTime > new Date() ? "Upcoming" : "Past"}
              </span>
            </li>
          ))}
          {bookings.length === 0 && (
            <li className="px-5 py-6 text-sm text-muted">No calls booked yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
