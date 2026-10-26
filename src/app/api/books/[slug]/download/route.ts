import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api";
import { absoluteUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hasPaidBook } from "@/lib/purchases";

export const dynamic = "force-dynamic";

/** Only buyers get the real file URL — it never appears in the page HTML. */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  const user = await getCurrentUser();
  const book = await prisma.book.findUnique({ where: { slug: params.slug } });

  if (!book) return NextResponse.redirect(absoluteUrl("/books"));

  if (!user) {
    return NextResponse.redirect(
      absoluteUrl(`/login?callbackUrl=${encodeURIComponent(`/books/${params.slug}`)}`),
    );
  }

  const owned = await hasPaidBook(user.id, book.id);
  if (!owned && user.role !== "ADMIN") {
    return NextResponse.redirect(absoluteUrl(`/books/${params.slug}?locked=1`));
  }

  return NextResponse.redirect(book.fileUrl);
}
