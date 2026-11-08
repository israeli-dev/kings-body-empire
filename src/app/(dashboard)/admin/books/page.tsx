import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { BooksManager, type AdminBook } from "./books-manager";

export const metadata: Metadata = { title: "Manage e-books" };
export const dynamic = "force-dynamic";

export default async function AdminBooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?callbackUrl=%2Fadmin%2Fbooks");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const rows = await prisma.book.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { purchases: { where: { status: "PAID" } } } },
    },
  });

  const books: AdminBook[] = rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    priceKobo: row.priceKobo,
    coverUrl: row.coverUrl,
    fileUrl: row.fileUrl,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    sales: row._count.purchases,
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold">E-book catalogue</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Add, price and publish e-books. Titles and prices are live the moment you save — files and
          covers are links to Cloudinary (or any host), so you can list a book now and attach the
          download link later.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/admin" className="btn-secondary btn-sm">← Coach console</Link>
          <Link href="/books" className="btn-secondary btn-sm">View public e-books page ↗</Link>
        </div>
      </header>

      <BooksManager initialBooks={books} />
    </div>
  );
}
