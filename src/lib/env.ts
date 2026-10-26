/** Environment access in one place, with sane fallbacks for local dev. */

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  process.env.NEXTAUTH_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

export const supportEmail =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "hello@kingsbodyempire.com";

export const whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_URL || "";

export const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL || "";

export const timeZone = process.env.NEXT_PUBLIC_TIMEZONE || "Africa/Lagos";

/** Paystack is optional: without keys the app runs with payments switched off. */
export function paystackSecretKey(): string | null {
  const key = process.env.PAYSTACK_SECRET_KEY?.trim();
  return key ? key : null;
}

export function paymentsEnabled(): boolean {
  return paystackSecretKey() !== null;
}

/** Absolute URL helper for callbacks and redirects. */
export function absoluteUrl(path: string): string {
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
