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
  searchParams: { locked?: string; unavailable?: string };
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const book = await prisma.book.findUnique({ where: { slug: params.slug } });
    if (!book) return { title: "E-book" };
    return {
      title: book.title,
      description: book.description ?? `${book.title} — a Kings Body Empire e-book.`,
    };
  } catch {
    return { title: "E-book" };
  }
}

export default async function BookPage({ params, searchParams }: PageProps) {
  let book: Awaited<ReturnType<typeof prisma.book.findUnique>> = null;
  let loadError = false;
  try {
    book = await prisma.book.findUnique({ where: { slug: params.slug } });
  } catch (error) {
    console.error("[books/[slug]] Could not load e-book:", error);
    loadError = true;
  }
  if (loadError) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-2xl font-semibold">The e-book catalogue is unavailable right now</h1>
        <p className="mt-3 text-sm text-muted">Please refresh in a moment. If it persists, contact support.</p>
        <Link href="/books" className="btn-secondary mt-6">Back to e-books</Link>
      </div>
    );
  }
  if (!book || !book.isActive) notFound();

  const user = await getCurrentUser();
  let purchase = null;
  try {
    purchase = user ? await hasPaidBook(user.id, book.id) : null;
  } catch (error) {
    console.error("[books/[slug]] Could not check ownership:", error);
  }
  const owned = Boolean(purchase) || user?.role === "ADMIN";

  return (
    <div className="container-page py-16">
      <Link href="/books" className="text-sm text-muted hover:text-ink">
        ← All e-books
      </Link>

      <div className="mt-8 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="card overflow-hidden p-0">
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden bg-panel-fade text-5xl">
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

          {searchParams.unavailable && (
            <p className="alert-info mt-4">
              Your payment is safe — but the file link has not been uploaded yet. The coach has it
              on the way; check back shortly or reply to your receipt email.
            </p>
          )}

          <div className="mt-6 max-w-sm">
            {!book.fileUrl && !owned ? (
              <div className="space-y-3">
                <p className="alert-info">
                  This e-book is being prepared — the download link will be added soon. Pricing is
                  shown so you know what to expect at launch.
                </p>
                <button type="button" className="btn-secondary w-full" disabled>
                  Coming soon
                </button>
              </div>
            ) : owned ? (
              <div className="space-y-3">
                <p className="alert-success">You own this e-book.</p>
                {book.fileUrl ? (
                  <a
                    href={`/api/books/${book.slug}/download`}
                    className="btn-primary w-full"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download the PDF
                  </a>
                ) : (
                  <p className="alert-info">
                    The file is on the way — the coach will attach the download link shortly.
                  </p>
                )}
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
