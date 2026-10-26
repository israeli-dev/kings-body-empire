import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  getCurrentUser,
  notFound,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { recalculateRank } from "@/lib/rank";
import { parseIntInRange, parseText } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const logs = await prisma.foodLog.findMany({
    where: { userId: user.id },
    orderBy: { loggedAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with a description.");

  const description = parseText(body.description, { min: 1, max: 300 });
  const calories = parseIntInRange(body.calories, 0, 20000);

  if (!description) return badRequest("Tell us what you ate.");

  try {
    const log = await prisma.foodLog.create({
      data: { userId: user.id, description, calories },
    });
    const rank = await recalculateRank(user.id);
    return NextResponse.json({ log, rank }, { status: 201 });
  } catch {
    return serverError("Could not save that meal.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A log id is required.");

  const deleted = await prisma.foodLog.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) return notFound("That food log no longer exists.");

  const rank = await recalculateRank(user.id);
  return NextResponse.json({ ok: true, rank });
}
