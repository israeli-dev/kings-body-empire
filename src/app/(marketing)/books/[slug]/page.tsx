import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BuyButton } from "@/components/buy-button";
import { getCurrentUser } from "@/lib/api";
import { formatNaira } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { hasPaidBook } from "@/lib/purchases";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { slug: string };
  searchParams: { locked?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const book = await prisma.book.findUnique({ where: { slug: params.slug } });
  if (!book) return { title: "E-book" };
  return {
    title: book.title,
    description: book.description ?? `${book.title} — a Kings Body Empire e-book.`,
  };
}

export default async function BookPage({ params, searchParams }: PageProps) {
  const book = await prisma.book.findUnique({ where: { slug: params.slug } });
  if (!book || !book.isActive) notFound();

  const user = await getCurrentUser();
  const purchase = user ? await hasPaidBook(user.id, book.id) : null;
  const owned = Boolean(purchase) || user?.role === "ADMIN";

  return (
    <div className="container-page py-16">
      <Link href="/books" className="text-sm text-muted hover:text-ink">
        ← All e-books
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card overflow-hidden p-0">
          <div className="flex aspect-[4/3] items-center justify-center bg-panel-fade text-5xl">
            {book.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={book.coverUrl} alt={book.title} className="h-full w-full object-cover" />
            ) : (
              <span aria-hidden="true">📕</span>
            )}
          </div>
        </div>

        <div>
          <p className="eyebrow">E-book</p>
          <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{book.title}</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {book.description ?? "A practical Kings Body Empire playbook you can use today."}
          </p>

          <p className="mt-6 text-3xl font-semibold text-gold">{formatNaira(book.priceKobo)}</p>

          {searchParams.locked && !owned && (
            <p className="alert-error mt-4">
              That download is for buyers only. Complete the purchase to unlock the file.
            </p>
          )}

          <div className="mt-6 max-w-sm">
            {owned ? (
              <div className="space-y-3">
                <p className="alert-success">You own this e-book.</p>
                <a
                  href={`/api/books/${book.slug}/download`}
                  className="btn-primary w-full"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download the PDF
                </a>
              </div>
            ) : (
              <BuyButton
                itemType="book"
                itemId={book.id}
                price={formatNaira(book.priceKobo)}
                signedIn={Boolean(user)}
              />
            )}
          </div>

          <dl className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Format</dt>
              <dd>PDF, download anytime</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Payments</dt>
              <dd>Card, transfer or USSD via Paystack</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Support</dt>
              <dd>Email the coach any time</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
