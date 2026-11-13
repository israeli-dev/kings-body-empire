import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import {
  addRoleCounts,
  emptyRoleCounts,
  toAdminUserSummary,
  type AdminUserQueryRow,
  type AdminUserSummary,
  type RoleCounts,
  type UserRoleName,
} from "@/lib/admin-users-core";
import { prisma } from "@/lib/prisma";
import { CoachesManager } from "./coaches-manager";

export const metadata: Metadata = { title: "Coaches & users" };
export const dynamic = "force-dynamic";

type GroupedRow = { role: UserRoleName; _count: { _all: number } };

export default async function AdminCoachesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fadmin%2Fcoaches");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [rows, grouped] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rank: true,
        createdAt: true,
      },
    }),
    prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
  ]);

  const counts: RoleCounts = emptyRoleCounts();
  for (const row of grouped as unknown as GroupedRow[]) {
    addRoleCounts(counts, row.role, row._count._all);
  }

  const initialUsers: AdminUserSummary[] = (rows as unknown as AdminUserQueryRow[]).map(
    toAdminUserSummary,
  );

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">Coaches &amp; users</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Search any account by name or email and make them a coach — just like editing a user
          in Supabase. Coaches keep their own login, rank and history; only their role changes.
          They&apos;ll see coach access the next time they sign in.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin" className="btn-secondary btn-sm">← Coach console</Link>
        </div>
      </header>

      <CoachesManager
        initialUsers={initialUsers}
        initialCounts={counts}
        currentUserId={user.id}
      />
    </div>
  );
}
