"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type AdminBook = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  priceKobo: number;
  coverUrl: string | null;
  fileUrl: string | null;
  isActive: boolean;
  createdAt: string;
  sales: number;
};

function formatNairaLocal(priceKobo: number): string {
  return `₦${(priceKobo / 100).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

type Draft = {
  title: string;
  description: string;
  priceNaira: string;
  fileUrl: string;
  coverUrl: string;
};

function toDraft(book: AdminBook): Draft {
  return {
    title: book.title,
    description: book.description ?? "",
    priceNaira: String(book.priceKobo / 100),
    fileUrl: book.fileUrl ?? "",
    coverUrl: book.coverUrl ?? "",
  };
}

export function BooksManager({ initialBooks }: { initialBooks: AdminBook[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initialBooks);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ---- add form state ----
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceNaira, setPriceNaira] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setCreating(true);

    const res = await fetch("/api/books", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        priceNaira,
        fileUrl: fileUrl || undefined,
        coverUrl: coverUrl || undefined,
      }),
    });
    setCreating(false);

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      setError((data.error as string) || "Could not add that e-book.");
      return;
    }

    setTitle("");
    setDescription("");
    setPriceNaira("");
    setFileUrl("");
    setCoverUrl("");
    setMessage("E-book added to the catalogue.");
    router.refresh();
    setBooks((current) => [
      ...current,
      {
        id: data.id as string,
        slug: data.slug as string,
        title: data.title as string,
        description: (data.description as string | null) ?? null,
        priceKobo: data.priceKobo as number,
        coverUrl: (data.coverUrl as string | null) ?? null,
        fileUrl: (data.fileUrl as string | null) ?? null,
        isActive: Boolean(data.isActive),
        createdAt: (data.createdAt as string) ?? new Date().toISOString(),
        sales: 0,
      },
    ]);
  }

  function startEdit(book: AdminBook) {
    setEditingSlug(book.slug);
    setDraft(toDraft(book));
    setError("");
    setMessage("");
  }

  async function saveEdit(slug: string) {
    if (!draft) return;
    setSaving(true);
    setError("");

    const res = await fetch(`/api/books/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        priceNaira: draft.priceNaira,
        fileUrl: draft.fileUrl, // empty string clears the link
        coverUrl: draft.coverUrl,
      }),
    });
    setSaving(false);

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      setError((data.error as string) || "Could not save changes.");
      return;
    }

    setBooks((current) =>
      current.map((book) =>
        book.slug === slug
          ? {
              ...book,
              title: data.title as string,
              description: (data.description as string | null) ?? null,
              priceKobo: data.priceKobo as number,
              fileUrl: (data.fileUrl as string | null) ?? null,
              coverUrl: (data.coverUrl as string | null) ?? null,
            }
          : book,
      ),
    );
    setEditingSlug(null);
    setDraft(null);
    setMessage("E-book updated.");
    router.refresh();
  }

  async function toggleActive(book: AdminBook) {
    setError("");
    const res = await fetch(`/api/books/${encodeURIComponent(book.slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !book.isActive }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      setError((data.error as string) || "Could not update that e-book.");
      return;
    }
    setBooks((current) =>
      current.map((b) => (b.slug === book.slug ? { ...b, isActive: Boolean(data.isActive) } : b)),
    );
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleCreate} className="card space-y-4">
        <h2 className="text-lg font-semibold">Add an e-book</h2>
        <p className="text-xs text-muted">
          The file itself stays on Cloudinary (or any host) — paste the link here. Leave the link
          empty and the book lists as “Coming soon” until you add it. Cover images work the same.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="new-book-title">Title</label>
            <input
              id="new-book-title"
              className="input"
              placeholder="e.g. How to Bulk-Up by 10kg in 8 Weeks — the Nigerian Way"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="new-book-description">Description (optional)</label>
            <textarea
              id="new-book-description"
              className="input min-h-[72px]"
              placeholder="What the reader will get out of it…"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="new-book-price">Price (₦)</label>
            <input
              id="new-book-price"
              className="input"
              inputMode="numeric"
              placeholder="8000"
              value={priceNaira}
              onChange={(event) => setPriceNaira(event.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="new-book-file">File link (PDF, optional)</label>
            <input
              id="new-book-file"
              className="input"
              placeholder="https://res.cloudinary.com/…/book.pdf"
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="new-book-cover">Cover image link (optional)</label>
            <input
              id="new-book-cover"
              className="input"
              placeholder="https://res.cloudinary.com/…/cover.jpg"
              value={coverUrl}
              onChange={(event) => setCoverUrl(event.target.value)}
            />
          </div>
        </div>

        {error && <p className="alert-error">{error}</p>}
        {message && <p className="alert-success">{message}</p>}

        <button type="submit" className="btn-primary" disabled={creating}>
          {creating ? "Adding…" : "Add e-book"}
        </button>
      </form>

      <section className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Catalogue</h2>
          <span className="text-xs text-muted">{books.length} e-books</span>
        </div>

        <ul className="mt-4 divide-y divide-line">
          {books.map((book) => {
            const editing = editingSlug === book.slug && draft;
            return (
              <li key={book.slug} className="py-4">
                {editing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`edit-title-${book.slug}`}>Title</label>
                        <input
                          id={`edit-title-${book.slug}`}
                          className="input"
                          value={draft.title}
                          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`edit-desc-${book.slug}`}>Description</label>
                        <textarea
                          id={`edit-desc-${book.slug}`}
                          className="input min-h-[64px]"
                          value={draft.description}
                          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`edit-price-${book.slug}`}>Price (₦)</label>
                        <input
                          id={`edit-price-${book.slug}`}
                          className="input"
                          inputMode="numeric"
                          value={draft.priceNaira}
                          onChange={(event) => setDraft({ ...draft, priceNaira: event.target.value })}
                        />
                      </div>
                      <div>
                        <label className="label" htmlFor={`edit-cover-${book.slug}`}>Cover link</label>
                        <input
                          id={`edit-cover-${book.slug}`}
                          className="input"
                          placeholder="https://…"
                          value={draft.coverUrl}
                          onChange={(event) => setDraft({ ...draft, coverUrl: event.target.value })}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="label" htmlFor={`edit-file-${book.slug}`}>File link (empty = clear)</label>
                        <input
                          id={`edit-file-${book.slug}`}
                          className="input"
                          placeholder="https://res.cloudinary.com/…/book.pdf"
                          value={draft.fileUrl}
                          onChange={(event) => setDraft({ ...draft, fileUrl: event.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="btn-primary btn-sm"
                        disabled={saving}
                        onClick={() => saveEdit(book.slug)}
                      >
                        {saving ? "Saving…" : "Save changes"}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => {
                          setEditingSlug(null);
                          setDraft(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-20 w-14 flex-none items-center justify-center overflow-hidden rounded-md border border-line bg-panel2 text-xl">
                        {book.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span aria-hidden="true">📕</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{book.title}</p>
                        <p className="mt-1 text-sm text-gold">{formatNairaLocal(book.priceKobo)}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                          <span className={book.isActive ? "text-success" : "text-danger"}>
                            {book.isActive ? "Listed" : "Hidden"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{book.fileUrl ? "File link ready" : "Link coming soon"}</span>
                          <span aria-hidden="true">·</span>
                          <span>{book.sales} sold</span>
                        </p>
                        {book.fileUrl && (
                          <a
                            href={book.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block max-w-xs truncate text-[11px] text-muted hover:text-ink"
                          >
                            {book.fileUrl}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-none flex-wrap gap-2">
                      <button type="button" className="btn-secondary btn-sm" onClick={() => startEdit(book)}>
                        Edit
                      </button>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => toggleActive(book)}>
                        {book.isActive ? "Hide" : "List again"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {books.length === 0 && (
            <li className="py-6 text-sm text-muted">No e-books yet. Add the first one above.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
