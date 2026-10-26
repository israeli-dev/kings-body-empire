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
import { parseDateTime } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const slots = await prisma.coachAvailability.findMany({
      where: { isBooked: false, startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 60,
    });
    return NextResponse.json(slots);
  } catch {
    return serverError("Could not load available times.");
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with startTime and endTime.");

  const startTime = parseDateTime(body.startTime);
  const endTime = parseDateTime(body.endTime);

  if (!startTime || !endTime) return badRequest("Both start and end time are required.");
  if (endTime <= startTime) return badRequest("The end time must be after the start time.");
  if (startTime < new Date(Date.now() - 60_000)) {
    return badRequest("That time is in the past — pick a future slot.");
  }

  try {
    const slot = await prisma.coachAvailability.create({ data: { startTime, endTime } });
    return NextResponse.json(slot, { status: 201 });
  } catch {
    return serverError("Could not create that slot.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A slot id is required.");

  const slot = await prisma.coachAvailability.findUnique({ where: { id } });
  if (!slot) return notFound("That slot no longer exists.");
  if (slot.isBooked) {
    return badRequest("That slot is booked — cancel the booking first.");
  }

  await prisma.coachAvailability.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
