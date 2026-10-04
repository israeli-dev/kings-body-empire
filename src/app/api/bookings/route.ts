import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (session.user as any).role === "ADMIN";

  if (isAdmin) {
    // Admins see every upcoming booking, with who booked it and their number
    const bookings = await prisma.callBooking.findMany({
      include: { slot: true, user: { select: { name: true, email: true } } },
      orderBy: { slot: { startTime: "asc" } },
    });
    return NextResponse.json(bookings);
  }

  const bookings = await prisma.callBooking.findMany({
    where: { userId: (session.user as any).id },
    include: { slot: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(bookings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { slotId, phone } = await req.json();
  if (!slotId) return NextResponse.json({ error: "slotId is required" }, { status: 400 });
  if (!phone) return NextResponse.json({ error: "A phone number is required so the coach can reach you" }, { status: 400 });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const slot = await tx.coachAvailability.findUnique({ where: { id: slotId } });
      if (!slot || slot.isBooked) {
        throw new Error("SLOT_TAKEN");
      }
      await tx.coachAvailability.update({ where: { id: slotId }, data: { isBooked: true } });
      return tx.callBooking.create({ data: { userId: (session.user as any).id, slotId, phone } });
    });
    return NextResponse.json(booking);
  } catch (err: any) {
    if (err.message === "SLOT_TAKEN") {
      return NextResponse.json({ error: "That slot was just booked by someone else — pick another." }, { status: 409 });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
