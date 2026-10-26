/** Tiny validators shared by API routes. Each returns `null` when invalid. */

export function parseText(
  value: unknown,
  { min = 1, max = 2000 }: { min?: number; max?: number } = {},
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) return null;
  return trimmed;
}

export function parseEmail(value: unknown): string | null {
  const email = parseText(value, { max: 254 });
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email.toLowerCase() : null;
}

export function parseIntInRange(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num) || !Number.isInteger(num)) return null;
  if (num < min || num > max) return null;
  return num;
}

export function parseFloatInRange(
  value: unknown,
  min: number,
  max: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(num)) return null;
  if (num < min || num > max) return null;
  return Math.round(num * 100) / 100;
}

export function parseHttpUrl(value: unknown): string | null {
  const text = parseText(value, { max: 2000 });
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) return null;
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function oneOf<T extends string>(value: unknown, options: readonly T[]): T | null {
  return typeof value === "string" && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function parseDateTime(value: unknown): Date | null {
  const text = parseText(value, { max: 64 });
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parsePhone(value: unknown): string | null {
  const text = parseText(value, { max: 32 });
  if (!text) return null;
  const digits = text.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return text;
}
