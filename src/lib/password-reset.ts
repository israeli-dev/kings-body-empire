import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Password-reset token rules, kept pure so they can be unit tested and shared
 * between the API route, the reset page and the tests.
 *
 * The raw token only ever exists in the email we send. The database stores a
 * SHA-256 hash of it, which is enough because the token is 256 bits of random
 * data (it never needs bcrypt — there is nothing guessable to slow down).
 */

/** How long a reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Minimum gap between reset emails to the same account. */
export const RESET_REQUEST_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

export const RESET_TOKEN_BYTES = 32;

/** A URL-safe token: 32 random bytes → 43 characters. */
export function generateResetToken(): string {
  return randomBytes(RESET_TOKEN_BYTES).toString("base64url");
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of two hex digests. */
export function resetTokenMatches(providedHash: string, storedHash: string): boolean {
  const a = Buffer.from(providedHash, "utf8");
  const b = Buffer.from(storedHash, "utf8");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

export function resetTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + RESET_TOKEN_TTL_MS);
}

export function isResetTokenExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export type ResetTokenState = "valid" | "expired" | "used";

export function resetTokenState(
  token: { expiresAt: Date; usedAt: Date | null },
  now: Date = new Date(),
): ResetTokenState {
  if (token.usedAt) return "used";
  if (isResetTokenExpired(token.expiresAt, now)) return "expired";
  return "valid";
}

/** Loose shape check before we bother hashing (43 chars of base64url). */
export function isWellFormedResetToken(token: unknown): token is string {
  return typeof token === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(token);
}

/** Password policy for both signup and reset. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters.";
  }
  if (password.length > 200) {
    return "Password is too long (maximum 200 characters).";
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Password must include at least one letter and one number.";
  }
  return null;
}
