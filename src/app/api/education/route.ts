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
import { EDUCATION_CATEGORIES, type EducationCategory } from "@/lib/content";
import { oneOf, parseHttpUrl, parseText } from "@/lib/validation";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const category = new URL(req.url).searchParams.get("category");

  try {
    const items = await prisma.educationContent.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch {
    return serverError("Could not load the library.");
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with the lesson details.");

  const title = parseText(body.title, { min: 2, max: 160 });
  const category = oneOf<EducationCategory>(body.category, EDUCATION_CATEGORIES);
  const videoUrl = parseHttpUrl(body.videoUrl);
  const thumbnailUrl = body.thumbnailUrl ? parseHttpUrl(body.thumbnailUrl) : null;

  if (!title) return badRequest("Give the lesson a title.");
  if (!category) return badRequest(`Category must be one of: ${EDUCATION_CATEGORIES.join(", ")}.`);
  if (!videoUrl) return badRequest("Video link must start with http:// or https://.");
  if (body.thumbnailUrl && !thumbnailUrl) {
    return badRequest("Thumbnail link must start with http:// or https://.");
  }

  try {
    const item = await prisma.educationContent.create({
      data: { title, category, videoUrl, thumbnailUrl },
    });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return serverError("Could not save that lesson.");
  }
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return badRequest("A lesson id is required.");

  const deleted = await prisma.educationContent.deleteMany({ where: { id } });
  if (deleted.count === 0) return notFound("That lesson no longer exists.");

  return NextResponse.json({ ok: true });
}
