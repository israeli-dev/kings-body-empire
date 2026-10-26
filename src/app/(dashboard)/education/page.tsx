"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { EDUCATION_CATEGORIES } from "@/lib/content";

type Item = {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
};

function youtubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function thumbnailFor(item: Item): string | null {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  const id = youtubeId(item.videoUrl);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

function Player({ url }: { url: string }) {
  const id = youtubeId(url);
  if (id) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${id}`}
        title="Lesson video"
        className="aspect-video w-full rounded-xl border border-line"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <video src={url} controls className="w-full rounded-xl border border-line">
      <track kind="captions" />
    </video>
  );
}

export default function EducationPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(EDUCATION_CATEGORIES[0]);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/education", { cache: "no-store" });
      if (res.ok) setItems((await res.json()) as Item[]);
      else setError("Could not load the library.");
    } catch {
      setError("Could not load the library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const res = await fetch("/api/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, videoUrl, thumbnailUrl }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error || "Could not add that lesson.");
      return;
    }

    setTitle("");
    setVideoUrl("");
    setThumbnailUrl("");
    setMessage("Lesson added.");
    void load();
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this lesson?")) return;
    const res = await fetch(`/api/education?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selected?.id === id) setSelected(null);
      void load();
    } else {
      setError("Could not delete that lesson.");
    }
  }

  const visible = filter === "All" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="mt-2 text-3xl font-semibold">Education</h1>
          <p className="mt-2 text-sm text-muted">
            Short lessons on diet, training, fat loss, bulking and rest.
          </p>
        </div>
        <span className="text-xs text-muted">{items.length} lessons</span>
      </header>

      {isAdmin && (
        <form onSubmit={handleAdd} className="card space-y-4">
          <h2 className="text-lg font-semibold">Add a lesson (admin)</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="lesson-title">Title</label>
              <input
                id="lesson-title"
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="lesson-category">Category</label>
              <select
                id="lesson-category"
                className="input"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {EDUCATION_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="lesson-video">Video link (YouTube or MP4)</label>
              <input
                id="lesson-video"
                className="input"
                placeholder="https://youtube.com/watch?v=…"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="lesson-thumb">Thumbnail (optional)</label>
              <input
                id="lesson-thumb"
                className="input"
                placeholder="https://…"
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
              />
            </div>
          </div>

          {error && <p className="alert-error">{error}</p>}
          {message && <p className="alert-success">{message}</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Add lesson"}
          </button>
        </form>
      )}

      {selected && (
        <section className="card space-y-4">
          <Player url={selected.videoUrl} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <span className="tag mt-1">{selected.category}</span>
            </div>
            <button type="button" className="btn-secondary btn-sm" onClick={() => setSelected(null)}>
              Close player
            </button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {["All", ...EDUCATION_CATEGORIES].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`tag ${filter === option ? "border-gold/60 text-gold" : "hover:text-ink"}`}
          >
            {option}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-muted">Loading lessons…</p>}

      {!loading && visible.length === 0 && (
        <p className="card text-sm text-muted">
          No lessons here yet. {isAdmin ? "Add the first one above." : "Check back soon."}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => {
          const thumb = thumbnailFor(item);
          return (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="block w-full text-left"
              >
                {thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={thumb}
                    alt={item.title}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center bg-panel2 text-2xl text-gold">
                    ▶
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                  <span className="tag mt-2">{item.category}</span>
                </div>
              </button>
              {isAdmin && (
                <div className="border-t border-line px-4 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="text-xs text-danger hover:underline"
                  >
                    Delete lesson
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
