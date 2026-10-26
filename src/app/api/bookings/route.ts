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
import { parsePhone, parseText } from "@/lib/validation";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    if (user.role === "ADMIN") {
      const bookings = await prisma.callBooking.findMany({
        include: { slot: true, user: { select: { name: true, email: true } } },
        orderBy: { slot: { startTime: "asc" } },
      });
      return NextResponse.json(bookings);
    }

    const bookings = await prisma.callBooking.findMany({
      where: { userId: user.id },
      include: { slot: true },
      orderBy: { slot: { startTime: "desc" } },
    });
    return NextResponse.json(bookings);
  } catch {
    return serverError("Could not load bookings.");
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with slotId and phone.");

  const slotId = parseText(body.slotId, { min: 1, max: 60 });
  const phone = parsePhone(body.phone);
  const notes = body.notes ? parseText(body.notes, { max: 500 }) : null;

  if (!slotId) return badRequest("Pick a slot first.");
  if (!phone) return badRequest("A phone number is required so the coach can reach you.");

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // Claim the slot atomically: only one request can flip isBooked false → true.
      const claimed = await tx.coachAvailability.updateMany({
        where: { id: slotId, isBooked: false, startTime: { gte: new Date() } },
        data: { isBooked: true },
      });
      if (claimed.count === 0) throw new Error("SLOT_TAKEN");

      return tx.callBooking.create({
        data: { userId: user.id, slotId, phone, notes },
        include: { slot: true },
      });
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_TAKEN") {
      return badRequest("That slot was just taken — pick another time.", 409);
    }
    return serverError("Could not book that slot.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A booking id is required.");

  const booking = await prisma.callBooking.findUnique({ where: { id } });
  if (!booking) return notFound("That booking no longer exists.");
  if (booking.userId !== user.id && user.role !== "ADMIN") {
    return notFound("That booking no longer exists.");
  }

  try {
    await prisma.$transaction([
      prisma.callBooking.delete({ where: { id } }),
      prisma.coachAvailability.update({ where: { id: booking.slotId }, data: { isBooked: false } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    return serverError("Could not cancel that booking.");
  }
}
