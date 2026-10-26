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
import { parseFloatInRange, parseIntInRange, parseText } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const logs = await prisma.workoutLog.findMany({
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
  if (!body) return badRequest("Send a JSON body with exercise, sets and reps.");

  const exercise = parseText(body.exercise, { min: 1, max: 120 });
  const sets = parseIntInRange(body.sets, 1, 100);
  const reps = parseIntInRange(body.reps, 1, 1000);
  const weightKg = parseFloatInRange(body.weightKg, 0, 1000);

  if (!exercise) return badRequest("Exercise name is required.");
  if (sets === null) return badRequest("Sets must be a whole number between 1 and 100.");
  if (reps === null) return badRequest("Reps must be a whole number between 1 and 1000.");

  try {
    const log = await prisma.workoutLog.create({
      data: { userId: user.id, exercise, sets, reps, weightKg },
    });
    await recalculateRank(user.id);
    return NextResponse.json(log, { status: 201 });
  } catch {
    return serverError("Could not save that workout.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A log id is required.");

  const deleted = await prisma.workoutLog.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) return notFound("That workout log no longer exists.");

  await recalculateRank(user.id);
  return NextResponse.json({ ok: true });
}
