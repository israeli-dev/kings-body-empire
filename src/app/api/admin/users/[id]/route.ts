import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getCurrentUser,
  notFound,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { validateRoleChange } from "@/lib/admin-users-core";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

/**
 * PATCH /api/admin/users/[id]  { role: "COACH" | "CLIENT" | "ADMIN" }
 *
 * Admin-only role change — this is how a client becomes a coach (and how a
 * coach can be stepped back down to client). Guards: admins cannot change
 * their own role, and the last admin cannot be demoted.
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await readJson(req);
  if (!body) {
    return badRequest('Send a JSON body with the new role, e.g. { "role": "COACH" }.');
  }

  const targetId = params.id?.trim();
  if (!targetId) return badRequest("A user id is required.");

  const newRole = body.role;
  const select = {
    id: true,
    name: true,
    email: true,
    role: true,
    rank: true,
    createdAt: true,
  } as const;

  try {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select });
    if (!target) return notFound("That user does not exist.");

    const adminCount =
      target.role === "ADMIN" ? await prisma.user.count({ where: { role: "ADMIN" } }) : 0;

    const error = validateRoleChange({
      actorId: user.id,
      targetId: target.id,
      targetRole: target.role,
      newRole,
      adminCount,
    });
    if (error) return badRequest(error);

    // validateRoleChange already confirmed the value is a valid role.
    const updated = await prisma.user.update({
      where: { id: target.id },
      data: { role: newRole as "CLIENT" | "COACH" | "ADMIN" },
      select,
    });

    return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch {
    return serverError("Could not update that user's role.");
  }
}
