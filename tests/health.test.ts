import { describe, expect, it } from "vitest";
import {
  classifyDatabaseError,
  evaluateAuthConfig,
  isLocalHostname,
  normaliseUrl,
  overallStatus,
  stripPort,
  summariseAuthConfig,
} from "@/lib/health";
import { isCredentialRejection, loginErrorMessage } from "@/lib/auth-errors";

const SECRET = "0123456789abcdef0123456789abcdef";

function codes(issues: { code: string }[]) {
  return issues.map((issue) => issue.code);
}

describe("evaluateAuthConfig", () => {
  it("passes a correct production setup", () => {
    expect(
      evaluateAuthConfig({
        secret: SECRET,
        nextAuthUrl: "https://kingsbodyempire.com/",
        publicSiteUrl: "https://kingsbodyempire.com",
        databaseUrl: "postgresql://user:pass@db:5432/postgres",
        requestHost: "kingsbodyempire.com",
        isProduction: true,
      }),
    ).toEqual([]);
  });

  it("catches a missing secret — the classic 'login never works deployed'", () => {
    const issues = evaluateAuthConfig({
      nextAuthUrl: "https://kingsbodyempire.com",
      databaseUrl: "postgresql://user:pass@db:5432/postgres",
      requestHost: "kingsbodyempire.com",
      isProduction: true,
    });
    expect(codes(issues)).toContain("NEXTAUTH_SECRET_MISSING");
    expect(issues[0].fix).toContain("openssl rand -base64 32");
  });

  it("catches the .env.example placeholder secret", () => {
    expect(
      codes(
        evaluateAuthConfig({
          secret: "replace-me-with-a-long-random-string",
          nextAuthUrl: "https://site.com",
          databaseUrl: "x",
          isProduction: true,
        }),
      ),
    ).toContain("NEXTAUTH_SECRET_PLACEHOLDER");
  });

  it("warns about a short secret without blocking", () => {
    const issues = evaluateAuthConfig({
      secret: "short",
      nextAuthUrl: "https://site.com",
      databaseUrl: "x",
      isProduction: true,
    });
    const short = issues.find((issue) => issue.code === "NEXTAUTH_SECRET_SHORT");
    expect(short?.severity).toBe("warn");
  });

  it("catches NEXTAUTH_URL pointing at localhost in production", () => {
    expect(
      codes(
        evaluateAuthConfig({
          secret: SECRET,
          nextAuthUrl: "http://localhost:3000",
          databaseUrl: "x",
          isProduction: true,
        }),
      ),
    ).toContain("NEXTAUTH_URL_LOCALHOST");
  });

  it("treats a localhost URL as a warning, not an error, outside production", () => {
    const issues = evaluateAuthConfig({
      secret: SECRET,
      nextAuthUrl: "http://localhost:3000",
      databaseUrl: "x",
      isProduction: false,
    });
    const local = issues.find((issue) => issue.code === "NEXTAUTH_URL_LOCALHOST");
    expect(local?.severity).toBe("warn");
    expect(issues.filter((issue) => issue.severity === "error")).toEqual([]);
  });

  it("catches a host mismatch between NEXTAUTH_URL and the request", () => {
    const issues = evaluateAuthConfig({
      secret: SECRET,
      nextAuthUrl: "https://old-name.onrender.com",
      databaseUrl: "x",
      requestHost: "kings-body-empire.onrender.com:443",
      isProduction: true,
    });
    const mismatch = issues.find((issue) => issue.code === "NEXTAUTH_URL_HOST_MISMATCH");
    expect(mismatch?.severity).toBe("error");
    expect(mismatch?.fix).toContain("kings-body-empire.onrender.com");
  });

  it("ignores a port difference and trailing slashes", () => {
    expect(
      codes(
        evaluateAuthConfig({
          secret: SECRET,
          nextAuthUrl: "http://localhost:3000/",
          databaseUrl: "x",
          requestHost: "localhost:3000",
          isProduction: false,
        }),
      ),
    ).not.toContain("NEXTAUTH_URL_HOST_MISMATCH");
  });

  it("flags http:// in production and site url drift", () => {
    const issues = evaluateAuthConfig({
      secret: SECRET,
      nextAuthUrl: "http://site.com",
      publicSiteUrl: "https://www.site.com",
      databaseUrl: "x",
      requestHost: "site.com",
      isProduction: true,
    });
    expect(codes(issues)).toContain("NEXTAUTH_URL_NOT_HTTPS");
    expect(codes(issues)).toContain("SITE_URL_MISMATCH");
  });

  it("flags a missing DATABASE_URL", () => {
    expect(
      codes(
        evaluateAuthConfig({
          secret: SECRET,
          nextAuthUrl: "https://site.com",
          isProduction: true,
        }),
      ),
    ).toContain("DATABASE_URL_MISSING");
  });
});

describe("summariseAuthConfig", () => {
  it("never leaks the secret value", () => {
    const summary = summariseAuthConfig({
      secret: SECRET,
      nextAuthUrl: "https://site.com",
      databaseUrl: "postgresql://user:secret@db/postgres",
      isProduction: true,
    });
    expect(JSON.stringify(summary)).not.toContain(SECRET);
    expect(JSON.stringify(summary)).not.toContain("secret@db");
    expect(summary.secretConfigured).toBe(true);
    expect(summary.secretLength).toBe(SECRET.length);
    expect(summary.ok).toBe(true);
  });

  it("is not ok when an error-level issue exists", () => {
    expect(summariseAuthConfig({ isProduction: true }).ok).toBe(false);
  });
});

describe("classifyDatabaseError", () => {
  it("recognises a paused Supabase project", () => {
    expect(
      classifyDatabaseError('ERROR: tenant/user "postgres.bgzhqlircygoqaergazw" not found').problem,
    ).toBe("paused-project");
  });

  it("recognises unreachable hosts and bad credentials", () => {
    expect(classifyDatabaseError("connect ECONNREFUSED 1.2.3.4:5432").problem).toBe("unreachable");
    expect(classifyDatabaseError("Timed out fetching a new connection (P1001)").problem).toBe(
      "unreachable",
    );
    expect(classifyDatabaseError("password authentication failed for user postgres").problem).toBe(
      "credentials",
    );
  });

  it("separates missing tables from missing columns", () => {
    const tables = classifyDatabaseError('The table `public.User` does not exist in the current database.');
    expect(tables.problem).toBe("missing-tables");
    expect(tables.hint).toContain("db:deploy");

    const columns = classifyDatabaseError(
      'The column `User.referralBonusDays` does not exist in the current database.',
    );
    expect(columns.problem).toBe("missing-columns");
    expect(columns.hint).toContain("migration");
  });

  it("falls back to unknown", () => {
    expect(classifyDatabaseError("something odd happened").problem).toBe("unknown");
  });
});

describe("loginErrorMessage", () => {
  it("only blames the password when NextAuth does", () => {
    expect(loginErrorMessage("CredentialsSignin")).toBe("That email or password is not right.");
    expect(loginErrorMessage("Configuration")).toContain("configuration problem");
    expect(loginErrorMessage("OAuthCallback")).toContain("configuration problem");
    expect(loginErrorMessage(null)).toBe("");
  });

  it("classifies credential rejections", () => {
    expect(isCredentialRejection("CredentialsSignin")).toBe(true);
    expect(isCredentialRejection("Configuration")).toBe(false);
  });
});

describe("helpers", () => {
  it("normalises URLs and hosts", () => {
    expect(normaliseUrl("https://site.com///")).toBe("https://site.com");
    expect(normaliseUrl("")).toBeNull();
    expect(stripPort("Site.COM:443")).toBe("site.com");
    expect(stripPort(null)).toBeNull();
    expect(isLocalHostname("localhost")).toBe(true);
    expect(isLocalHostname("127.0.0.1")).toBe(true);
    expect(isLocalHostname("app.localhost")).toBe(true);
    expect(isLocalHostname("kingsbodyempire.com")).toBe(false);
  });

  it("reduces to one status word", () => {
    expect(overallStatus({ databaseUp: true, authOk: true, schemaOk: true })).toBe("ok");
    expect(overallStatus({ databaseUp: true, authOk: true, schemaOk: false })).toBe("degraded");
    expect(overallStatus({ databaseUp: false, authOk: true, schemaOk: true })).toBe("degraded");
  });
});
