import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getCurrentUser,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { parseText } from "@/lib/validation";
import { parseNairaToKobo } from "@/lib/money";
import { parseOptionalUrl } from "@/lib/optional-url";

export const dynamic = "force-dynamic";

function slugify(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "book";
}

/** GET — admin catalogue with sales counts (the public pages read the DB directly). */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  try {
    const books = await prisma.book.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { purchases: { where: { status: "PAID" } } } },
      },
    });
    return NextResponse.json(books);
  } catch {
    return serverError("Could not load the e-book catalogue.");
  }
}

/** POST — create a book. `fileUrl` may be omitted; it can be pasted later from the admin page. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with the book details.");

  const title = parseText(body.title, { min: 2, max: 160 });
  const description = body.description ? parseText(body.description, { min: 1, max: 600 }) : null;
  const priceKobo = parseNairaToKobo(body.priceNaira);
  const file = parseOptionalUrl(body.fileUrl);
  const cover = parseOptionalUrl(body.coverUrl);

  if (!title) return badRequest("Give the e-book a title (2–160 characters).");
  if (priceKobo === null) return badRequest("Enter a valid price in naira, e.g. 8000.");
  if (body.description && !description) return badRequest("Description must be 600 characters or fewer.");
  if ("error" in file) return badRequest(`File link: ${file.error}`);
  if ("error" in cover) return badRequest(`Cover link: ${cover.error}`);

  // Unique slug from the title plus a short time suffix.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const suffix = Date.now().toString(36) + (attempt > 0 ? `-${attempt}` : "");
    try {
      const book = await prisma.book.create({
        data: {
          title,
          slug: `${slugify(title)}-${suffix}`,
          description,
          priceKobo,
          fileUrl: "url" in file ? file.url : null,
          coverUrl: "url" in cover ? cover.url : null,
        },
      });
      return NextResponse.json(book, { status: 201 });
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === "P2002" && attempt < 2) continue; // slug collision — try again
      return serverError("Could not save that e-book.");
    }
  }
  return serverError("Could not save that e-book.");
}
