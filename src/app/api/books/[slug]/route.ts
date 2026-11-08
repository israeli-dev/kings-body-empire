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
import { parseText } from "@/lib/validation";
import { parseNairaToKobo } from "@/lib/money";
import { parseOptionalUrl } from "@/lib/optional-url";

export const dynamic = "force-dynamic";

type RouteContext = { params: { slug: string } };

/**
 * PATCH — update an e-book. Any subset of: title, description, priceNaira,
 * fileUrl, coverUrl, isActive. Sending an empty string for fileUrl/coverUrl
 * clears the link (the book goes back to "link coming soon").
 */
export async function PATCH(req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const existing = await prisma.book.findUnique({ where: { slug: params.slug } });
  if (!existing) return notFound("That e-book does not exist.");

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with the fields to update.");

  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = parseText(body.title, { min: 2, max: 160 });
    if (!title) return badRequest("Title must be 2–160 characters.");
    data.title = title;
  }

  if (body.description !== undefined) {
    if (body.description === null || body.description === "") {
      data.description = null;
    } else {
      const description = parseText(body.description, { min: 1, max: 600 });
      if (!description) return badRequest("Description must be 600 characters or fewer.");
      data.description = description;
    }
  }

  if (body.priceNaira !== undefined) {
    const priceKobo = parseNairaToKobo(body.priceNaira);
    if (priceKobo === null) return badRequest("Enter a valid price in naira, e.g. 8000.");
    data.priceKobo = priceKobo;
  }

  const file = parseOptionalUrl(body.fileUrl);
  if ("error" in file) return badRequest(`File link: ${file.error}`);
  if (!("absent" in file)) data.fileUrl = file.url;

  const cover = parseOptionalUrl(body.coverUrl);
  if ("error" in cover) return badRequest(`Cover link: ${cover.error}`);
  if (!("absent" in cover)) data.coverUrl = cover.url;

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return badRequest("isActive must be true or false.");
    data.isActive = body.isActive;
  }

  if (Object.keys(data).length === 0) return badRequest("Nothing to update.");

  try {
    const book = await prisma.book.update({ where: { slug: params.slug }, data });
    return NextResponse.json(book);
  } catch {
    return serverError("Could not update that e-book.");
  }
}

/** DELETE — soft-delete: the row stays so purchase history keeps working. */
export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const existing = await prisma.book.findUnique({ where: { slug: params.slug } });
  if (!existing) return notFound("That e-book does not exist.");

  try {
    const book = await prisma.book.update({
      where: { slug: params.slug },
      data: { isActive: false },
    });
    return NextResponse.json(book);
  } catch {
    return serverError("Could not hide that e-book.");
  }
}
