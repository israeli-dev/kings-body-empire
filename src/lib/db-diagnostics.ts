/**
 * Pure helpers that explain database connection problems in human language.
 * No Prisma import here, so the seed script, the CLI check and the unit tests
 * can all share it.
 */

export type DbUrlInfo = {
  host: string;
  port: string;
  database: string;
  user: string;
  hasPassword: boolean;
  params: Record<string, string>;
  /** Same URL with the password masked — safe to print. */
  redacted: string;
  isSupabasePooler: boolean;
  supabasePoolerRef: string | null;
  isSupabaseDirect: boolean;
  isLocal: boolean;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "host.docker.internal"]);

export function parseDatabaseUrl(raw: string | null | undefined): DbUrlInfo | null {
  if (!raw || !raw.trim()) return null;

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (!/^postgres(ql)?:$/.test(url.protocol)) return null;
  if (!url.hostname) return null;

  const user = decodeURIComponent(url.username);
  const password = url.password;
  const host = url.hostname;
  const port = url.port || "5432";
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";

  const params: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const isSupabasePooler = /^[^.]+\.pooler\.supabase\.com$/i.test(host);
  const directMatch = /^db\.([a-z0-9]+)\.supabase\.co$/i.exec(host);
  const userRefMatch = /^postgres\.([a-z0-9]+)$/i.exec(user);

  const redacted = `postgresql://${user}${password ? ":****" : ""}@${host}:${port}/${database}${url.search}`;

  return {
    host,
    port,
    database,
    user,
    hasPassword: Boolean(password),
    params,
    redacted,
    isSupabasePooler,
    supabasePoolerRef: isSupabasePooler && userRefMatch ? userRefMatch[1] : null,
    isSupabaseDirect: Boolean(directMatch),
    isLocal: LOCAL_HOSTS.has(host.toLowerCase()),
  };
}

export type IssueSeverity = "error" | "warn" | "info";

export type DiagnosticIssue = {
  severity: IssueSeverity;
  title: string;
  detail?: string;
  fixes?: string[];
};

const PLACEHOLDER_PATTERN =
  /(?:^|[/:@?&])(?:\*{3,}|x{3,}|your[-_]?(?:password|user|host|db)|user:password|changeme|<[^>]+>|example\.(?:com|org))/i;

/** Static checks that do not need a live connection. */
export function inspectDatabaseUrl(info: DbUrlInfo, raw: string): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  if (!info.hasPassword) {
    issues.push({
      severity: "error",
      title: "DATABASE_URL has no password",
      detail: "The URL looks like it is missing the password part.",
      fixes: ["Copy the full connection string again from your database provider."],
    });
  }

  if (PLACEHOLDER_PATTERN.test(raw)) {
    issues.push({
      severity: "error",
      title: "DATABASE_URL still contains placeholder text",
      detail: "It looks like the example from .env.example, not a real connection string.",
      fixes: [
        "Open your database dashboard and copy the real connection string.",
        "Paste it into .env as DATABASE_URL=… (keep the quotes).",
      ],
    });
  }

  if (info.isSupabasePooler) {
    if (info.port === "6543") {
      issues.push({
        severity: "warn",
        title: "You are using Supabase's transaction pooler (port 6543)",
        detail:
          "Migrations cannot run through the transaction pooler. The app itself is fine with it once the schema exists.",
        fixes: [
          "Run `npm run db:migrate` with the direct URL (port 5432), then switch back.",
          "Or keep the pooler URL and append &pgbouncer=true&connection_limit=1 for the app.",
        ],
      });
    }

    issues.push({
      severity: "info",
      title: `Supabase pooler user detects project ref "${info.supabasePoolerRef ?? "unknown"}"`,
      detail:
        "The pooler host must belong to the same region as that project, and the project must be running (free projects pause when idle).",
      fixes: [
        "Supabase → Project Settings → Database → Connection string → copy the URI again.",
        "If the project was paused, open the dashboard and resume it first.",
      ],
    });
  }

  if (info.isSupabaseDirect && !info.params.sslmode) {
    issues.push({
      severity: "info",
      title: "Direct Supabase connection without sslmode",
      detail: "Supabase requires TLS. Add ?sslmode=require if the connection is refused.",
    });
  }

  if (!info.isLocal && !info.isSupabasePooler && !info.isSupabaseDirect) {
    if (!info.params.sslmode && !info.params.ssl) {
      issues.push({
        severity: "warn",
        title: "Remote host with no sslmode parameter",
        detail:
          "Most hosted Postgres providers require TLS (or present a certificate Prisma does not trust).",
        fixes: ["Append ?sslmode=require (or ?sslmode=no-verify for a self-signed cert)."],
      });
    }
  }

  return issues;
}

export type ConnectionDiagnosis = {
  title: string;
  summary: string;
  fixes: string[];
};

const LOCAL_START_HINT = [
  "Start the bundled database: `docker compose up -d`",
  "Or install Postgres: `sudo apt-get install -y postgresql && sudo service postgresql start`",
  'Then set DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kings_body_empire?schema=public"',
];

/** Maps a raw Prisma/Postgres error message to something actionable. */
export function diagnoseConnectionError(
  message: string,
  info: DbUrlInfo | null,
): ConnectionDiagnosis {
  const text = message || "";
  const host = info ? `${info.host}:${info.port}` : "the configured host";
  const direct = info?.supabasePoolerRef
    ? `postgresql://postgres:<your-db-password>@db.${info.supabasePoolerRef}.supabase.co:5432/postgres?sslmode=require`
    : "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres?sslmode=require";

  // The Supabase pooler cannot route that project reference.
  if (/tenant\/user .*not found/i.test(text) || /ENOTFOUND\)\s*tenant/i.test(text)) {
    return {
      title: "Supabase does not recognise that project",
      summary:
        "This message comes from Supabase's pooler, not Postgres. It was given a project reference it cannot route: " +
        `"${info?.supabasePoolerRef ?? "unknown"}" on ${host}.`,
      fixes: [
        "Check the project ref: Supabase → Project Settings → General → Reference ID. It must match the part after `postgres.` in the username.",
        "Check the region in the host (aws-0-eu-central-1, aws-0-us-east-1, …) — it must be the project's own region.",
        "If the project is paused (free tier pauses when idle) or was deleted, open the dashboard and resume it.",
        "Easiest path: Project Settings → Database → Connection string → copy the URI shown there and replace DATABASE_URL.",
        `Or use the direct connection instead: ${direct}`,
        "Run `npm run db:check` again to confirm before migrating or seeding.",
      ],
    };
  }

  // Schema not created yet.
  if (/P2021|relation .* does not exist|table .* does not exist|no such table/i.test(text)) {
    return {
      title: "The database is reachable but has no tables yet",
      summary: "Migrations have not been applied to this database.",
      fixes: [
        "Run `npm run db:migrate` (development) or `npm run db:deploy` (production/CI).",
        "Then run `npm run db:seed` again.",
      ],
    };
  }

  if (/ECONNREFUSED/i.test(text)) {
    const local = info?.isLocal ?? false;
    return {
      title: local
        ? "No Postgres server is listening on that port"
        : "The database refused the connection",
      summary: local
        ? `Nothing answered at ${host} — Postgres is probably not running.`
        : `${host} is reachable but refused the connection.`,
      fixes: local
        ? LOCAL_START_HINT
        : [
            "Make sure the database is running and accepts external connections.",
            "Check the port in DATABASE_URL (Postgres default: 5432).",
          ],
    };
  }

  if (/P1001|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(text)) {
    return {
      title: "That database host could not be found",
      summary: `DNS could not resolve ${host}. The hostname in DATABASE_URL is wrong, or the instance no longer exists.`,
      fixes: [
        "Re-copy the connection string from your provider's dashboard.",
        "In a Codespace/devcontainer, check that outbound network access is allowed.",
        ...(info?.isLocal ? LOCAL_START_HINT : []),
      ],
    };
  }

  if (/28P01|password authentication failed|P1000|authentication failed/i.test(text)) {
    return {
      title: "Wrong database username or password",
      summary: `Postgres rejected the credentials in DATABASE_URL for ${host}.`,
      fixes: [
        "Copy the password again — and URL-encode special characters (@ → %40, # → %23, / → %2F).",
        "Supabase: Project Settings → Database → Reset database password, then update .env.",
        "Check the username: direct Supabase connections use `postgres`; the pooler uses `postgres.<project-ref>`.",
      ],
    };
  }

  if (/3D000|P1003|database .* does not exist/i.test(text)) {
    return {
      title: "That database name does not exist",
      summary: `The server is up but has no database named "${info?.database ?? "(unknown)"}".`,
      fixes: [
        "Supabase/Neon use `postgres` as the database name.",
        "For a local install create it: `createdb kings_body_empire`.",
      ],
    };
  }

  if (/ETIMEDOUT|P1008|timeout|timed out/i.test(text)) {
    return {
      title: "The connection timed out",
      summary: `${host} never answered. Something between you and the database is blocking it.`,
      fixes: [
        "Supabase: Project Settings → Database → Network Restrictions (allow your IP, or 0.0.0.0/0 while testing).",
        "Neon: check the IP allowlist for the branch.",
        "Check that the project is not paused.",
      ],
    };
  }

  if (/self.signed certificate|self signed certificate|sslmode|certificate|SSL/i.test(text)) {
    return {
      title: "TLS/SSL negotiation failed",
      summary: "The server's certificate was not accepted.",
      fixes: [
        "Append ?sslmode=require to DATABASE_URL.",
        "For a self-signed certificate use ?sslmode=no-verify (local development only).",
      ],
    };
  }

  return {
    title: "Could not connect to the database",
    summary: text.split("\n").filter(Boolean).slice(-1)[0] || text || "Unknown error",
    fixes: [
      "Run `npm run db:check` for a redacted summary of DATABASE_URL and a diagnosis.",
      "Make sure `.env` exists (copy .env.example) and DATABASE_URL is set.",
      "See the Troubleshooting section of README.md.",
    ],
  };
}
