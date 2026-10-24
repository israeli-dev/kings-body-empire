"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const CATEGORIES = ["Diet", "Workout", "Fat Loss", "Bulking", "Rest"];

type Item = {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
};

function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function thumbFor(item: Item): string | null {
  if (item.thumbnailUrl) return item.thumbnailUrl;
  const yt = youtubeId(item.videoUrl);
  return yt ? `https://img.youtube.com/vi/${yt}/hqdefault.jpg` : null;
}

function Player({ url }: { url: string }) {
  const yt = youtubeId(url);
  if (yt) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${yt}`}
        style={{ width: "100%", aspectRatio: "16 / 9", border: 0 }}
        allowFullScreen
      />
    );
  }
  return <video src={url} controls style={{ width: "100%" }} />;
}

export default function EducationPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";

  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<string>("All");
  const [selected, setSelected] = useState<Item | null>(null);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  async function load() {
    const res = await fetch("/api/education");
    if (res.ok) setItems(await res.json());
  }
  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category, videoUrl, thumbnailUrl }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setTitle(""); setVideoUrl(""); setThumbnailUrl("");
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this video?")) return;
    const res = await fetch(`/api/education?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      if (selected?.id === id) setSelected(null);
      load();
    }
  }

  const visible = filter === "All" ? items : items.filter((i) => i.category === filter);

  return (
    <main style={{ maxWidth: 900, margin: "40px auto", padding: 24 }}>
      <h1>Education</h1>

      {isAdmin && (
        <section style={{ marginTop: 24, padding: 16, border: "1px solid #333" }}>
          <h2 style={{ fontSize: 16 }}>Add a video (admin)</h2>
          <form onSubmit={handleAdd} style={{ display: "grid", gap: 10, marginTop: 10 }}>
            <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Video link (YouTube or direct video URL)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} required />
            <input placeholder="Thumbnail image link (optional)" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} />
            {error && <p style={{ color: "red" }}>{error}</p>}
            <button type="submit">Add video</button>
          </form>
        </section>
      )}

      {selected && (
        <section style={{ marginTop: 24 }}>
          <Player url={selected.videoUrl} />
          <h2 style={{ marginTop: 10 }}>{selected.title}</h2>
          <div style={{ fontSize: 13, color: "#999" }}>{selected.category}</div>
        </section>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 28 }}>
        {["All", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            style={{ fontWeight: filter === c ? 700 : 400, borderBottom: filter === c ? "2px solid #F5B301" : "2px solid transparent" }}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16, marginTop: 20 }}>
        {visible.map((item) => {
          const thumb = thumbFor(item);
          return (
            <div key={item.id} style={{ border: "1px solid #333" }}>
              <div onClick={() => setSelected(item)} style={{ cursor: "pointer" }}>
                {thumb ? (
                  <img src={thumb} alt={item.title} style={{ width: "100%", aspectRatio: "16 / 9", objectFit: "cover", display: "block" }} />
                ) : (
                  <div style={{ width: "100%", aspectRatio: "16 / 9", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5B301" }}>
                    ▶
                  </div>
                )}
                <div style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>{item.category}</div>
                </div>
              </div>
              {isAdmin && (
                <button onClick={() => handleDelete(item.id)} style={{ margin: "0 12px 12px", fontSize: 12, color: "#f66" }}>
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
      {visible.length === 0 && <p style={{ color: "#999", marginTop: 20 }}>No videos here yet.</p>}
    </main>
  );
}
