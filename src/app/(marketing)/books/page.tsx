import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "E-books",
  description: "Practical playbooks: Nigerian meal plans, hypertrophy blocks and cutting guides.",
};

export const dynamic = "force-dynamic";

export default async function BooksPage() {
  const user = await getCurrentUser();

  const [books, ownedIds] = await Promise.all([
    prisma.book.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    user
      ? prisma.bookPurchase
          .findMany({ where: { userId: user.id, status: "PAID" }, select: { bookId: true } })
          .then((rows) => rows.map((row) => row.bookId))
      : Promise.resolve<string[]>([]),
  ]);

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">E-books</p>
        <h1 className="mt-3 text-4xl font-semibold">The playbooks</h1>
        <p className="mt-4 text-sm text-muted">
          Written for the food you actually eat and the equipment you actually have. Buy once,
          download from your account whenever you need it.
        </p>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => {
          const owned = ownedIds.includes(book.id);
          return (
            <article key={book.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="flex aspect-[4/3] items-center justify-center bg-panel-fade text-4xl">
                {book.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span aria-hidden="true">📕</span>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold">{book.title}</h2>
                  {owned && <span className="tag border-gold/50 text-gold">Owned</span>}
                </div>
                {book.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted">{book.description}</p>
                )}
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-lg font-semibold text-gold">
                    {formatNaira(book.priceKobo)}
                  </span>
                  <Link href={`/books/${book.slug}`} className="btn-secondary btn-sm">
                    Details
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {books.length === 0 && (
        <p className="card mt-10 text-sm text-muted">
          No e-books published yet. Run <code className="text-gold">npm run db:seed</code> to add
          the starter catalogue.
        </p>
      )}
    </div>
  );
}
