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
import { parseFloatInRange } from "@/lib/validation";

const FIELDS = [
  "weightKg",
  "heightCm",
  "waistCm",
  "shoulderCm",
  "chestCm",
  "armCm",
] as const;

type Field = (typeof FIELDS)[number];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const logs = await prisma.measurementLog.findMany({
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
  if (!body) return badRequest("Send a JSON body with your measurements.");

  const values: Partial<Record<Field, number | null>> = {};
  for (const field of FIELDS) {
    values[field] = parseFloatInRange(body[field], 0, 500);
  }

  const filled = FIELDS.filter((field) => values[field] !== null);
  if (filled.length === 0) {
    return badRequest("Enter at least one measurement (weight, waist, chest…).");
  }

  try {
    const log = await prisma.measurementLog.create({
      data: { userId: user.id, ...values },
    });
    await recalculateRank(user.id);
    return NextResponse.json(log, { status: 201 });
  } catch {
    return serverError("Could not save those measurements.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A log id is required.");

  const deleted = await prisma.measurementLog.deleteMany({ where: { id, userId: user.id } });
  if (deleted.count === 0) return notFound("That measurement no longer exists.");

  await recalculateRank(user.id);
  return NextResponse.json({ ok: true });
}
