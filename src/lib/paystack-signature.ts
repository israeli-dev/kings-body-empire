import { createHmac, timingSafeEqual } from "node:crypto";

/** Paystack signs webhook bodies with HMAC-SHA512 of the raw body. */
export function paystackSignature(rawBody: string, secret: string): string {
  return createHmac("sha512", secret).update(rawBody, "utf8").digest("hex");
}

/** Constant-time comparison of the `x-paystack-signature` header. */
export function verifyPaystackSignature(
  rawBody: string,
  signature: string | null | undefined,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  const expected = paystackSignature(rawBody, secret);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
