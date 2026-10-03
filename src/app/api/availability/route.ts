import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const slots = await prisma.coachAvailability.findMany({
    where: { isBooked: false, startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
  });
  return NextResponse.json(slots);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const { startTime, endTime } = await req.json();
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime are required" }, { status: 400 });
  }
  const slot = await prisma.coachAvailability.create({
    data: { startTime: new Date(startTime), endTime: new Date(endTime) },
  });
  return NextResponse.json(slot);
}
