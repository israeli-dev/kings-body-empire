import { describe, expect, it } from "vitest";
import {
  inferredNextAuthUrl,
  isPublicUrl,
  resolveSiteUrl,
  resolveSiteUrlWithSource,
} from "@/lib/site-url";

describe("resolveSiteUrl", () => {
  it("prefers NEXT_PUBLIC_SITE_URL", () => {
    expect(
      resolveSiteUrl({
        NEXT_PUBLIC_SITE_URL: "https://kingsbodyempire.com",
        NEXTAUTH_URL: "https://other.example",
        RENDER_EXTERNAL_URL: "https://service.onrender.com",
      }),
    ).toBe("https://kingsbodyempire.com");
  });

  it("falls back to NEXTAUTH_URL", () => {
    expect(
      resolveSiteUrl({
        NEXTAUTH_URL: "https://kings-body-empire.onrender.com",
        RENDER_EXTERNAL_URL: "https://service.onrender.com",
      }),
    ).toBe("https://kings-body-empire.onrender.com");
  });

  it("uses the platform URL when both app variables were forgotten", () => {
    // This is the Render case: only Render's own variable exists.
    expect(resolveSiteUrl({ RENDER_EXTERNAL_URL: "https://kings-body-empire.onrender.com" })).toBe(
      "https://kings-body-empire.onrender.com",
    );
    // Vercel exposes a bare hostname, so the scheme is added.
    expect(resolveSiteUrl({ VERCEL_URL: "kings-body-empire.vercel.app" })).toBe(
      "https://kings-body-empire.vercel.app",
    );
  });

  it("strips trailing slashes and whitespace", () => {
    expect(resolveSiteUrl({ NEXTAUTH_URL: "  https://site.com///  " })).toBe("https://site.com");
  });

  it("only invents localhost when nothing at all is configured", () => {
    expect(resolveSiteUrl({})).toBe("http://localhost:3000");
    expect(resolveSiteUrl({ NEXTAUTH_URL: "   " })).toBe("http://localhost:3000");
  });

  it("reports where the value came from", () => {
    expect(resolveSiteUrlWithSource({ NEXTAUTH_URL: "https://a.example" }).source).toBe(
      "NEXTAUTH_URL",
    );
    expect(resolveSiteUrlWithSource({ RENDER_EXTERNAL_URL: "https://b.example" }).source).toBe(
      "RENDER_EXTERNAL_URL",
    );
    expect(resolveSiteUrlWithSource({}).source).toBe("fallback");
  });
});

describe("inferredNextAuthUrl", () => {
  it("never overrides an existing NEXTAUTH_URL", () => {
    expect(
      inferredNextAuthUrl({
        NEXTAUTH_URL: "https://kingsbodyempire.com",
        RENDER_EXTERNAL_URL: "https://service.onrender.com",
      }),
    ).toBeNull();
  });

  it("adopts the Render URL when NEXTAUTH_URL is missing", () => {
    expect(
      inferredNextAuthUrl({ RENDER_EXTERNAL_URL: "https://kings-body-empire.onrender.com" }),
    ).toBe("https://kings-body-empire.onrender.com");
  });

  it("adopts a bare Vercel host with https", () => {
    expect(inferredNextAuthUrl({ VERCEL_URL: "app.vercel.app" })).toBe("https://app.vercel.app");
  });

  it("stays quiet in plain local development", () => {
    expect(inferredNextAuthUrl({})).toBeNull();
  });
});

describe("isPublicUrl", () => {
  it("accepts a real https deployment", () => {
    expect(isPublicUrl("https://kings-body-empire.onrender.com")).toBe(true);
  });

  it("rejects localhost, http and nonsense", () => {
    expect(isPublicUrl("http://localhost:3000")).toBe(false);
    expect(isPublicUrl("http://site.com")).toBe(false);
    expect(isPublicUrl("not a url")).toBe(false);
  });
});
