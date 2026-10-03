import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const logs = await prisma.measurementLog.findMany({
    where: { userId: (session.user as any).id },
    orderBy: { loggedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(logs);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { weightKg, heightCm, waistCm, shoulderCm, chestCm, armCm } = await req.json();
  const log = await prisma.measurementLog.create({
    data: {
      userId: (session.user as any).id,
      weightKg: weightKg ? Number(weightKg) : null,
      heightCm: heightCm ? Number(heightCm) : null,
      waistCm: waistCm ? Number(waistCm) : null,
      shoulderCm: shoulderCm ? Number(shoulderCm) : null,
      chestCm: chestCm ? Number(chestCm) : null,
      armCm: armCm ? Number(armCm) : null,
    },
  });
  return NextResponse.json(log);
}
