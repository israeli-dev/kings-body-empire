import { describe, expect, it } from "vitest";
import {
  RESET_TOKEN_TTL_MS,
  generateResetToken,
  hashResetToken,
  isResetTokenExpired,
  isWellFormedResetToken,
  passwordProblem,
  resetTokenExpiry,
  resetTokenMatches,
  resetTokenState,
} from "@/lib/password-reset";
import { clientKey, rateLimit } from "@/lib/rate-limit";

const NOW = new Date("2026-10-26T12:00:00Z");

describe("reset tokens", () => {
  it("produces a URL-safe token of the expected shape", () => {
    const token = generateResetToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isWellFormedResetToken(token)).toBe(true);
  });

  it("generates a different token every time", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generateResetToken()));
    expect(tokens.size).toBe(50);
  });

  it("hashes deterministically without storing the token", () => {
    const token = generateResetToken();
    const hash = hashResetToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(hashResetToken(token));
    expect(hash).not.toContain(token);
  });

  it("compares hashes safely", () => {
    const a = hashResetToken("token-a");
    const b = hashResetToken("token-b");
    expect(resetTokenMatches(a, a)).toBe(true);
    expect(resetTokenMatches(a, b)).toBe(false);
    expect(resetTokenMatches("", "")).toBe(false);
    expect(resetTokenMatches(a, a.slice(0, 10))).toBe(false);
  });

  it("expires one hour after issue", () => {
    const expires = resetTokenExpiry(NOW);
    expect(expires.getTime() - NOW.getTime()).toBe(RESET_TOKEN_TTL_MS);
    expect(isResetTokenExpired(expires, new Date(NOW.getTime() + 1000))).toBe(false);
    expect(isResetTokenExpired(expires, new Date(NOW.getTime() + RESET_TOKEN_TTL_MS))).toBe(
      true,
    );
  });

  it("rejects malformed tokens before it touches the database", () => {
    expect(isWellFormedResetToken("short")).toBe(false);
    expect(isWellFormedResetToken("has spaces in it".padEnd(43, "x"))).toBe(false);
    expect(isWellFormedResetToken("a".repeat(43) + "!")).toBe(false);
    expect(isWellFormedResetToken(undefined)).toBe(false);
    expect(isWellFormedResetToken(12345)).toBe(false);
  });

  it("classifies token state", () => {
    const future = new Date(NOW.getTime() + 60_000);
    const past = new Date(NOW.getTime() - 60_000);
    expect(resetTokenState({ expiresAt: future, usedAt: null }, NOW)).toBe("valid");
    expect(resetTokenState({ expiresAt: past, usedAt: null }, NOW)).toBe("expired");
    expect(resetTokenState({ expiresAt: future, usedAt: NOW }, NOW)).toBe("used");
    // used wins over expired
    expect(resetTokenState({ expiresAt: past, usedAt: NOW }, NOW)).toBe("used");
  });
});

describe("password policy", () => {
  it("accepts a reasonable password", () => {
    expect(passwordProblem("Strong123")).toBeNull();
  });

  it("rejects short, letterless or numberless passwords", () => {
    expect(passwordProblem("short1")).toContain("at least 8");
    expect(passwordProblem("allletters")).toContain("letter and one number");
    expect(passwordProblem("12345678")).toContain("letter and one number");
    expect(passwordProblem(undefined)).toContain("at least 8");
    expect(passwordProblem("x".repeat(201))).toContain("too long");
  });
});

describe("rate limiting", () => {
  it("allows up to the limit then blocks with a retry hint", () => {
    const key = `test-${Math.random()}`;
    const t0 = 1_000_000;

    expect(rateLimit(key, 3, 60_000, t0).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 1).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000, t0 + 2).ok).toBe(true);

    const blocked = rateLimit(key, 3, 60_000, t0 + 3);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);

    // window rolls over
    expect(rateLimit(key, 3, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("derives a per-IP key from forwarding headers", () => {
    const req = new Request("http://x/api", {
      headers: { "x-forwarded-for": "102.89.1.5, 10.0.0.1" },
    });
    expect(clientKey(req, "forgot-password")).toBe("forgot-password:102.89.1.5");

    const noHeaders = new Request("http://x/api");
    expect(clientKey(noHeaders, "reset-password")).toBe("reset-password:local");
  });
});
