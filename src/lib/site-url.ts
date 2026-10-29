/**
 * Where this deployment believes it lives.
 *
 * `NEXTAUTH_URL` and `NEXT_PUBLIC_SITE_URL` must describe the public URL, and
 * getting them wrong is the classic "login works locally, never deployed" bug.
 * Hosting platforms already tell us the truth, so use it as a fallback instead
 * of silently pretending we are on localhost:
 *
 *   1. NEXT_PUBLIC_SITE_URL      (explicit wins)
 *   2. NEXTAUTH_URL
 *   3. RENDER_EXTERNAL_URL       (Render sets this automatically)
 *   4. VERCEL_URL                (bare host — needs https://)
 *   5. http://localhost:3000     (development only)
 *
 * Pure on purpose: the caller passes the env, so this is unit tested.
 */
export type EnvLike = Record<string, string | undefined>;

export type SiteUrlSource =
  | "NEXT_PUBLIC_SITE_URL"
  | "NEXTAUTH_URL"
  | "RENDER_EXTERNAL_URL"
  | "VERCEL_URL"
  | "fallback";

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, "");
}

export function resolveSiteUrl(env: EnvLike): string {
  return resolveSiteUrlWithSource(env).url;
}

export function resolveSiteUrlWithSource(env: EnvLike): {
  url: string;
  source: SiteUrlSource;
} {
  const ordered: [SiteUrlSource, string | undefined][] = [
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL],
    ["NEXTAUTH_URL", env.NEXTAUTH_URL],
    ["RENDER_EXTERNAL_URL", env.RENDER_EXTERNAL_URL],
    ["VERCEL_URL", env.VERCEL_URL],
  ];

  for (const [source, value] of ordered) {
    const cleaned = clean(value);
    if (cleaned) return { url: cleaned, source };
  }

  return { url: "http://localhost:3000", source: "fallback" };
}

/**
 * The value NextAuth should use. When NEXTAUTH_URL is missing but the platform
 * told us the public URL, adopt it — otherwise NextAuth guesses from request
 * headers and issues cookies for the wrong host.
 */
export function inferredNextAuthUrl(env: EnvLike): string | null {
  if (clean(env.NEXTAUTH_URL)) return null; // already configured, leave it alone
  const renderUrl = clean(env.RENDER_EXTERNAL_URL);
  if (renderUrl) return renderUrl;
  const vercelUrl = clean(env.VERCEL_URL);
  if (vercelUrl) return vercelUrl;
  return null;
}

/** True when the URL is usable as a public app URL (not localhost, https). */
export function isPublicUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    return !local && parsed.protocol === "https:";
  } catch {
    return false;
  }
}
