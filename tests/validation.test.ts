import { describe, expect, it } from "vitest";
import {
  oneOf,
  parseDateTime,
  parseEmail,
  parseFloatInRange,
  parseHttpUrl,
  parseIntInRange,
  parsePhone,
  parseText,
} from "@/lib/validation";

describe("parseText", () => {
  it("trims and enforces length", () => {
    expect(parseText("  Bench press  ")).toBe("Bench press");
    expect(parseText("   ")).toBeNull();
    expect(parseText("ab", { min: 3 })).toBeNull();
    expect(parseText("a".repeat(20), { max: 10 })).toBeNull();
    expect(parseText(42)).toBeNull();
  });
});

describe("parseEmail", () => {
  it("accepts valid addresses and lowercases them", () => {
    expect(parseEmail("Coach@KingsBody.com")).toBe("coach@kingsbody.com");
  });

  it("rejects malformed addresses", () => {
    expect(parseEmail("nope")).toBeNull();
    expect(parseEmail("a@b")).toBeNull();
    expect(parseEmail("")).toBeNull();
  });
});

describe("numbers", () => {
  it("validates integers in range", () => {
    expect(parseIntInRange("4", 1, 100)).toBe(4);
    expect(parseIntInRange(4.5, 1, 100)).toBeNull();
    expect(parseIntInRange("0", 1, 100)).toBeNull();
    expect(parseIntInRange("", 1, 100)).toBeNull();
  });

  it("validates floats in range and rounds to 2dp", () => {
    expect(parseFloatInRange("70.456", 0, 500)).toBe(70.46);
    expect(parseFloatInRange("501", 0, 500)).toBeNull();
    expect(parseFloatInRange(null, 0, 500)).toBeNull();
  });
});

describe("parseHttpUrl", () => {
  it("accepts http and https", () => {
    expect(parseHttpUrl("https://youtube.com/watch?v=abc")).toContain("https://");
    expect(parseHttpUrl("http://example.com")).toContain("http://");
  });

  it("rejects other protocols", () => {
    expect(parseHttpUrl("javascript:alert(1)")).toBeNull();
    expect(parseHttpUrl("ftp://example.com")).toBeNull();
    expect(parseHttpUrl("example.com")).toBeNull();
  });
});

describe("parseDateTime", () => {
  it("parses ISO strings", () => {
    const date = parseDateTime("2026-11-01T18:00:00.000Z");
    expect(date?.toISOString()).toBe("2026-11-01T18:00:00.000Z");
  });

  it("rejects garbage", () => {
    expect(parseDateTime("not a date")).toBeNull();
  });
});

describe("parsePhone", () => {
  it("accepts Nigerian formats", () => {
    expect(parsePhone("0803 123 4567")).toBe("0803 123 4567");
    expect(parsePhone("+2348031234567")).toBe("+2348031234567");
  });

  it("rejects too short or too long numbers", () => {
    expect(parsePhone("123")).toBeNull();
    expect(parsePhone("1234567890123456")).toBeNull();
  });
});

describe("oneOf", () => {
  it("checks against allowed values", () => {
    expect(oneOf("package", ["package", "book"] as const)).toBe("package");
    expect(oneOf("dvd", ["package", "book"] as const)).toBeNull();
  });
});
