import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const isHttpUrl = (v: unknown) => typeof v === "string" && /^https?:\/\//i.test(v);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const category = new URL(req.url).searchParams.get("category");
  const items = await prisma.educationContent.findMany({
    where: category ? { category } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const { title, category, videoUrl, thumbnailUrl } = await req.json();
  if (!title || !category || !videoUrl) {
    return NextResponse.json({ error: "Title, category and video link are required" }, { status: 400 });
  }
  if (!isHttpUrl(videoUrl) || (thumbnailUrl && !isHttpUrl(thumbnailUrl))) {
    return NextResponse.json({ error: "Links must start with http:// or https://" }, { status: 400 });
  }
  const item = await prisma.educationContent.create({
    data: { title, category, videoUrl, thumbnailUrl: thumbnailUrl || null },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  await prisma.educationContent.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
