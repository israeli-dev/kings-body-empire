import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.foodLog.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { loggedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { description, calories } = await req.json();
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }
  // loggedAt is NOT taken from the client — Prisma's @default(now()) stamps it server-side
  const log = await prisma.foodLog.create({
    data: {
      userId: (session.user as any).id,
      description,
      calories: calories ? Number(calories) : null,
    },
  });
  return NextResponse.json(log);
}
