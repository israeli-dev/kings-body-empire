import { parseHttpUrl } from "./validation";

/**
 * Optional media links in a request body (e-book files, cover art):
 *  - field absent      → `{ absent: true }`  (leave the column untouched on update)
 *  - empty string      → `{ url: null }`     (clear the link)
 *  - http(s) URL       → `{ url: string }`   (set the link)
 *  - anything else     → `{ error: string }`
 *
 * Note: e-books are hosted elsewhere (Cloudinary or any host) — the app only
 * stores the link, never the file itself.
 */
export function parseOptionalUrl(
  value: unknown,
): { absent: true } | { url: string | null } | { error: string } {
  if (value === undefined) return { absent: true };
  if (typeof value === "string" && value.trim() === "") return { url: null };
  const parsed = parseHttpUrl(value);
  if (!parsed) return { error: "Links must start with http:// or https://." };
  return { url: parsed };
}
