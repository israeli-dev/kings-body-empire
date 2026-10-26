import { describe, expect, it } from "vitest";
import {
  diagnoseConnectionError,
  inspectDatabaseUrl,
  parseDatabaseUrl,
} from "@/lib/db-diagnostics";

const SUPABASE_POOLER =
  "postgresql://postgres.bgzhqlircygoqaergazw:s3cret@aws-0-eu-central-1.pooler.supabase.com:6543/postgres";
const SUPABASE_DIRECT =
  "postgresql://postgres:s3cret@db.bgzhqlircygoqaergazw.supabase.co:5432/postgres?sslmode=require";
const LOCAL = "postgresql://postgres:postgres@localhost:5432/kings_body_empire?schema=public";

describe("parseDatabaseUrl", () => {
  it("reads a Supabase pooler URL and extracts the project ref", () => {
    const info = parseDatabaseUrl(SUPABASE_POOLER);
    expect(info).not.toBeNull();
    expect(info?.host).toBe("aws-0-eu-central-1.pooler.supabase.com");
    expect(info?.port).toBe("6543");
    expect(info?.user).toBe("postgres.bgzhqlircygoqaergazw");
    expect(info?.database).toBe("postgres");
    expect(info?.isSupabasePooler).toBe(true);
    expect(info?.supabasePoolerRef).toBe("bgzhqlircygoqaergazw");
    expect(info?.isLocal).toBe(false);
  });

  it("recognises a direct Supabase host", () => {
    const info = parseDatabaseUrl(SUPABASE_DIRECT);
    expect(info?.isSupabaseDirect).toBe(true);
    expect(info?.isSupabasePooler).toBe(false);
    expect(info?.params.sslmode).toBe("require");
  });

  it("recognises localhost and defaults the port", () => {
    const info = parseDatabaseUrl("postgresql://postgres:pw@localhost/kings_body_empire");
    expect(info?.isLocal).toBe(true);
    expect(info?.port).toBe("5432");
    expect(info?.database).toBe("kings_body_empire");
  });

  it("never leaks the password in the redacted string", () => {
    const info = parseDatabaseUrl(SUPABASE_POOLER);
    expect(info?.redacted).not.toContain("s3cret");
    expect(info?.redacted).toContain(":****@");
  });

  it("returns null for missing or malformed values", () => {
    expect(parseDatabaseUrl(undefined)).toBeNull();
    expect(parseDatabaseUrl("")).toBeNull();
    expect(parseDatabaseUrl("not a url")).toBeNull();
    expect(parseDatabaseUrl("mysql://user:pw@host:3306/db")).toBeNull();
  });
});

describe("inspectDatabaseUrl", () => {
  it("flags the .env.example placeholder", () => {
    const raw = "postgresql://user:password@host:5432/kings_body_empire";
    const info = parseDatabaseUrl(raw)!;
    const errors = inspectDatabaseUrl(info, raw).filter((i) => i.severity === "error");
    expect(errors.map((e) => e.title)).toContain("DATABASE_URL still contains placeholder text");
  });

  it("warns when the transaction pooler port is used for migrations", () => {
    const info = parseDatabaseUrl(SUPABASE_POOLER)!;
    const issues = inspectDatabaseUrl(info, SUPABASE_POOLER);
    expect(issues.some((i) => i.severity === "warn" && i.title.includes("transaction pooler"))).toBe(
      true,
    );
  });

  it("is quiet about a healthy local URL", () => {
    const info = parseDatabaseUrl(LOCAL)!;
    expect(inspectDatabaseUrl(info, LOCAL)).toHaveLength(0);
  });

  it("warns about a remote host without sslmode", () => {
    const raw = "postgresql://app:pw@db.internal.example.net:5432/app";
    const info = parseDatabaseUrl(raw)!;
    const issues = inspectDatabaseUrl(info, raw);
    expect(issues.some((i) => i.title.includes("sslmode"))).toBe(true);
  });
});

describe("diagnoseConnectionError", () => {
  it("explains the Supabase tenant/project-ref failure", () => {
    const info = parseDatabaseUrl(SUPABASE_POOLER)!;
    const diagnosis = diagnoseConnectionError(
      "Error querying the database: FATAL: (ENOTFOUND) tenant/user postgres.bgzhqlircygoqaergazw not found",
      info,
    );
    expect(diagnosis.title).toBe("Supabase does not recognise that project");
    expect(diagnosis.summary).toContain("bgzhqlircygoqaergazw");
    expect(diagnosis.fixes.join(" ")).toContain("db.bgzhqlircygoqaergazw.supabase.co");
  });

  it("points at migrations when tables are missing", () => {
    const diagnosis = diagnoseConnectionError(
      'The table `public.User` does not exist in the current database.',
      parseDatabaseUrl(LOCAL)!,
    );
    expect(diagnosis.fixes.join(" ")).toContain("npm run db:migrate");
  });

  it("tells you to start Postgres when nothing listens locally", () => {
    const diagnosis = diagnoseConnectionError(
      "connect ECONNREFUSED 127.0.0.1:5432",
      parseDatabaseUrl(LOCAL)!,
    );
    expect(diagnosis.title).toBe("No Postgres server is listening on that port");
    expect(diagnosis.fixes.join(" ")).toContain("docker compose up -d");
  });

  it("maps bad credentials", () => {
    const diagnosis = diagnoseConnectionError(
      'error: password authentication failed for user "postgres"',
      parseDatabaseUrl(SUPABASE_DIRECT)!,
    );
    expect(diagnosis.title).toBe("Wrong database username or password");
  });

  it("maps unknown DNS hosts", () => {
    const diagnosis = diagnoseConnectionError(
      "Can't reach database server (P1001): getaddrinfo ENOTFOUND wrong-host",
      parseDatabaseUrl(SUPABASE_DIRECT)!,
    );
    expect(diagnosis.title).toBe("That database host could not be found");
  });

  it("falls back to a generic, still useful answer", () => {
    const diagnosis = diagnoseConnectionError("something odd happened", null);
    expect(diagnosis.fixes.join(" ")).toContain("npm run db:check");
  });
});
