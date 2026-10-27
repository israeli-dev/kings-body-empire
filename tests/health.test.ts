import { describe, expect, it } from "vitest";
import {
  classifyDatabaseError,
  describeDatabaseTarget,
  evaluateAuthConfig,
  extractDiagnosticCode,
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

  it("does not treat localhost and 127.0.0.1 as a host mismatch", () => {
    const issues = evaluateAuthConfig({
      secret: SECRET,
      nextAuthUrl: "http://localhost:3000",
      databaseUrl: "x",
      requestHost: "127.0.0.1:3000",
      isProduction: false,
    });
    expect(codes(issues)).not.toContain("NEXTAUTH_URL_HOST_MISMATCH");
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

  it("recognises Prisma's real unreachable wording (the deployed bug)", () => {
    // This is what Prisma actually prints; it contains no "P1001" token, which
    // is why the deployed build reported the useless "Database query failed."
    const diagnosis = classifyDatabaseError(
      "Can't reach database server at `aws-1-eu-west-1.pooler.supabase.com:6543`",
    );
    expect(diagnosis.problem).toBe("unreachable");
    expect(diagnosis.hint).toContain("pooler");
  });

  it("recognises pool exhaustion and pgbouncer statement clashes", () => {
    expect(
      classifyDatabaseError(
        "Timed out fetching a new connection from the connection pool. (P2024)",
      ).problem,
    ).toBe("pool-exhausted");
    expect(
      classifyDatabaseError('prepared statement "s0" already exists').problem,
    ).toBe("pgbouncer-prepared-statements");
    expect(classifyDatabaseError("FATAL: too many connections").problem).toBe("pool-exhausted");
  });

  it("recognises a missing or malformed DATABASE_URL", () => {
    expect(
      classifyDatabaseError("error: Environment variable not found: DATABASE_URL.").problem,
    ).toBe("invalid-url");
    expect(classifyDatabaseError("3D000: database \"nope\" does not exist").problem).toBe(
      "missing-database",
    );
  });

  it("drops the diagnostics when the URL password is rejected", () => {
    expect(classifyDatabaseError("P1000: Authentication failed against database").problem).toBe(
      "credentials",
    );
  });

  it("falls back to unknown", () => {
    const diagnosis = classifyDatabaseError("something odd happened");
    expect(diagnosis.problem).toBe("unknown");
    expect(diagnosis.code).toBeNull();
  });

  it("extracts the Prisma code or SQLSTATE for the response", () => {
    expect(extractDiagnosticCode("Timed out fetching a new connection (P2024)")).toBe("P2024");
    expect(extractDiagnosticCode("FATAL: password authentication failed 28P01")).toBe("28P01");
    expect(extractDiagnosticCode("no code here at all")).toBeNull();
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

describe("describeDatabaseTarget (no secrets leaked)", () => {
  const cases: [string, string, string][] = [
    [
      "postgresql://postgres.bgzhqlircygoqaergazw:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
      "supabase-session-pooler",
      "5432",
    ],
    [
      "postgresql://postgres.ref:secret@aws-1-eu-west-1.pooler.supabase.com:6543/postgres",
      "supabase-transaction-pooler",
      "6543",
    ],
    [
      "postgresql://postgres:secret@db.bgzhqlircygoqaergazw.supabase.co:5432/postgres",
      "supabase-direct",
      "5432",
    ],
    ["postgresql://postgres:postgres@localhost:5432/kings", "local", "5432"],
  ];

  it("names the connection style and port", () => {
    for (const [url, kind, port] of cases) {
      const target = describeDatabaseTarget(url);
      expect(target.kind).toBe(kind);
      expect(target.port).toBe(port);
      expect(target.configured).toBe(true);
    }
  });

  it("flags the IPv6-only direct host", () => {
    expect(
      describeDatabaseTarget(
        "postgresql://postgres:secret@db.ref.supabase.co:5432/postgres",
      ).likelyIpv6Only,
    ).toBe(true);
    expect(
      describeDatabaseTarget(
        "postgresql://postgres.ref:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
      ).likelyIpv6Only,
    ).toBe(false);
  });

  it("catches a quoted or missing value", () => {
    expect(describeDatabaseTarget('"postgresql://user:pass@host:5432/db"').kind).toBe("invalid");
    expect(describeDatabaseTarget("").kind).toBe("none");
    expect(describeDatabaseTarget(undefined).configured).toBe(false);
  });

  it("never echoes the host, user or password", () => {
    const payload = JSON.stringify(
      describeDatabaseTarget(
        "postgresql://postgres.bgzhqlircygoqaergazw:supersecret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
      ),
    );
    expect(payload).not.toContain("supersecret");
    expect(payload).not.toContain("pooler.supabase.com");
    expect(payload).not.toContain("bgzhqlircygoqaergazw");
  });
});
