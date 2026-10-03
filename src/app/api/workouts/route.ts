import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.workoutLog.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { loggedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { exercise, sets, reps, weightKg } = await req.json();
  if (!exercise || !sets || !reps) {
    return NextResponse.json({ error: "Exercise, sets and reps are required" }, { status: 400 });
  }
  const log = await prisma.workoutLog.create({
    data: {
      userId: (session.user as any).id,
      exercise,
      sets: Number(sets),
      reps: Number(reps),
      weightKg: weightKg ? Number(weightKg) : null,
    },
  });
  return NextResponse.json(log);
}
