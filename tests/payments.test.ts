import { describe, expect, it } from "vitest";
import { formatNaira, nairaToKobo, parseNairaToKobo } from "@/lib/money";
import { paystackSignature, verifyPaystackSignature } from "@/lib/paystack-signature";

describe("money", () => {
  it("formats kobo as naira", () => {
    expect(formatNaira(2_500_000)).toBe("₦25,000");
    expect(formatNaira(750_000)).toBe("₦7,500");
    expect(formatNaira(1_000_050)).toBe("₦10,000.50");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("converts naira to kobo", () => {
    expect(nairaToKobo(250)).toBe(25_000);
    expect(parseNairaToKobo("₦25,000")).toBe(2_500_000);
    expect(parseNairaToKobo("1250.75")).toBe(125_075);
    expect(parseNairaToKobo("abc")).toBeNull();
    expect(parseNairaToKobo("-5")).toBeNull();
  });
});

describe("paystack signature", () => {
  const secret = "sk_test_example";
  const body = JSON.stringify({ event: "charge.success", data: { reference: "kbe_pkg_123" } });

  it("verifies a signature produced with the same secret", () => {
    const signature = paystackSignature(body, secret);
    expect(verifyPaystackSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const signature = paystackSignature(body, secret);
    const tampered = body.replace("123", "999");
    expect(verifyPaystackSignature(tampered, signature, secret)).toBe(false);
  });

  it("rejects a missing signature or empty secret", () => {
    expect(verifyPaystackSignature(body, null, secret)).toBe(false);
    expect(verifyPaystackSignature(body, paystackSignature(body, secret), "")).toBe(false);
  });
});
