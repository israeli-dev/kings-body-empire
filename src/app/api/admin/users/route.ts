import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getCurrentUser,
  serverError,
  unauthorized,
} from "@/lib/api";
import {
  addRoleCounts,
  emptyRoleCounts,
  parseUserListQuery,
  toAdminUserSummary,
  type AdminUserQueryRow,
  type UserRoleName,
} from "@/lib/admin-users-core";
import type { UserRole } from "@/types";

export const dynamic = "force-dynamic";

type GroupedRow = { role: UserRoleName; _count: { _all: number } };

/**
 * GET /api/admin/users?q=&role=&limit=
 *
 * Admin-only user search (Supabase-style): find anyone by name or email and
 * optionally narrow to one role. `counts` always describes the whole table
 * so the UI can render its role-filter tabs with totals.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const params = new URL(req.url).searchParams;
  const query = parseUserListQuery({
    q: params.get("q"),
    role: params.get("role"),
    limit: params.get("limit"),
  });
  if (!query) {
    return badRequest("Invalid search. Role must be CLIENT, COACH, ADMIN or ALL.");
  }

  const where = {
    ...(query.role !== "ALL" ? { role: query.role as UserRole } : {}),
    ...(query.q
      ? {
          OR: [
            { name: { contains: query.q, mode: "insensitive" as const } },
            { email: { contains: query.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  try {
    const [users, total, grouped] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: query.limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          rank: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ["role"], _count: { _all: true } }),
    ]);

    const counts = emptyRoleCounts();
    for (const row of grouped as unknown as GroupedRow[]) {
      addRoleCounts(counts, row.role, row._count._all);
    }

    const summaries = (users as unknown as AdminUserQueryRow[]).map(toAdminUserSummary);

    return NextResponse.json({ users: summaries, total, counts });
  } catch {
    return serverError("Could not load users.");
  }
}
