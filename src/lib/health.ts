/**
 * Deployment health rules in one pure, testable place.
 *
 * The motivating bug: sign-in worked on the developer's machine and never on the
 * deployed site, and nothing in the app said why. The usual causes are all
 * environment problems, so the health endpoint now reports them explicitly —
 * presence and shape only, never a secret value.
 */

export type Severity = "error" | "warn";

export type HealthIssue = {
  /** Stable identifier, safe to grep / assert in tests. */
  code: string;
  severity: Severity;
  message: string;
  fix: string;
};

export type AuthConfigInput = {
  secret?: string | null;
  nextAuthUrl?: string | null;
  publicSiteUrl?: string | null;
  databaseUrl?: string | null;
  /** Host header of the incoming request, e.g. "kings-body-empire.onrender.com". */
  requestHost?: string | null;
  isProduction: boolean;
};

const PLACEHOLDER_SECRETS = new Set([
  "replace-me-with-a-long-random-string",
  "changeme",
  "secret",
  "your-secret",
  "test",
]);

const REQUIRED_AUTH_ENV = ["NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;

function hostOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim();
  if (!text) return null;
  try {
    return new URL(text.includes("://") ? text : `https://${text}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Normalises "https://x.com/" → "https://x.com" for comparisons. */
export function normaliseUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = value.trim().replace(/\/+$/, "");
  return text || null;
}

/** "kings.onrender.com:443" → "kings.onrender.com" (ports never matter here). */
export function stripPort(host: string | null | undefined): string | null {
  if (!host) return null;
  const clean = host.trim().toLowerCase();
  if (!clean) return null;
  // Leave IPv6 literals alone; they are not used for these deployments.
  if (clean.startsWith("[")) return clean;
  return clean.split(":")[0] || null;
}

export function isLocalHostname(host: string | null | undefined): boolean {
  if (!host) return false;
  const clean = host.toLowerCase();
  return (
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.endsWith(".localhost")
  );
}

/**
 * Everything that can make sign-in fail on a deployment while working locally.
 * Returns an empty array when the auth configuration looks sane.
 */
export function evaluateAuthConfig(input: AuthConfigInput): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const secret = input.secret?.trim() ?? "";
  const nextAuthUrl = normaliseUrl(input.nextAuthUrl);
  const publicSiteUrl = normaliseUrl(input.publicSiteUrl);
  const requestHost = stripPort(input.requestHost);

  // 1. The secret. In production NextAuth refuses to issue a session without it,
  //    which looks exactly like "the password is wrong" to the client.
  if (!secret) {
    issues.push({
      code: "NEXTAUTH_SECRET_MISSING",
      severity: "error",
      message: input.isProduction
        ? "NEXTAUTH_SECRET is not set, so NextAuth cannot sign a session — sign-in and sign-up both fail on this deployment."
        : "NEXTAUTH_SECRET is not set. It is tolerated in development but will break a production deployment.",
      fix: 'Run `openssl rand -base64 32` and set NEXTAUTH_SECRET in the hosting dashboard (Vercel → Settings → Environment Variables, Render → Environment), then redeploy.',
    });
  } else if (PLACEHOLDER_SECRETS.has(secret.toLowerCase())) {
    issues.push({
      code: "NEXTAUTH_SECRET_PLACEHOLDER",
      severity: "error",
      message: "NEXTAUTH_SECRET is still the example value from .env.example.",
      fix: "Generate a real one with `openssl rand -base64 32` and redeploy.",
    });
  } else if (secret.length < 32) {
    issues.push({
      code: "NEXTAUTH_SECRET_SHORT",
      severity: "warn",
      message: `NEXTAUTH_SECRET is only ${secret.length} characters.`,
      fix: "Use at least 32 random characters (`openssl rand -base64 32`). Changing it signs everyone out once.",
    });
  }

  // 2. NEXTAUTH_URL must exist and describe the public site, not localhost.
  if (!nextAuthUrl) {
    issues.push({
      code: "NEXTAUTH_URL_MISSING",
      severity: input.isProduction ? "error" : "warn",
      message:
        "NEXTAUTH_URL is not set, so callbacks and redirects are guessed from request headers. Behind a proxy that guess is often wrong.",
      fix: "Set NEXTAUTH_URL to the exact public URL, e.g. https://kings-body-empire.onrender.com (no trailing slash).",
    });
  } else {
    const urlHost = hostOf(nextAuthUrl);

    if (isLocalHostname(urlHost)) {
      // Correct while developing, fatal once deployed — so the severity flips.
      issues.push({
        code: "NEXTAUTH_URL_LOCALHOST",
        severity: input.isProduction ? "error" : "warn",
        message: input.isProduction
          ? `NEXTAUTH_URL points at ${urlHost}, so the deployed site sends sessions and redirects to that host instead of itself.`
          : `NEXTAUTH_URL is ${urlHost} — correct for local development, but a deployed build needs its own public URL.`,
        fix: "Set NEXTAUTH_URL to the deployment's public URL and redeploy. On Vercel it must be the production domain, not a preview URL.",
      });
    } else if (input.isProduction && nextAuthUrl.startsWith("http://")) {
      issues.push({
        code: "NEXTAUTH_URL_NOT_HTTPS",
        severity: "warn",
        message: "NEXTAUTH_URL uses http:// — the session cookie is marked secure in production and will be dropped.",
        fix: "Use https:// in NEXTAUTH_URL.",
      });
    }

    // 3. A mismatch with the host actually serving the request is the classic
    //    "login bounces straight back to /login" bug.
    if (urlHost && requestHost && urlHost !== requestHost) {
      issues.push({
        code: "NEXTAUTH_URL_HOST_MISMATCH",
        severity: "error",
        message: `NEXTAUTH_URL is ${urlHost} but this request arrived on ${requestHost}. Sessions are issued for one host and read on another.`,
        fix: `Set NEXTAUTH_URL to https://${requestHost} (or point your custom domain at this service) and redeploy.`,
      });
    }

    if (publicSiteUrl && publicSiteUrl !== nextAuthUrl) {
      issues.push({
        code: "SITE_URL_MISMATCH",
        severity: "warn",
        message: `NEXT_PUBLIC_SITE_URL (${publicSiteUrl}) differs from NEXTAUTH_URL (${nextAuthUrl}). Password-reset and Paystack callback links will use the wrong base URL.`,
        fix: "Make both variables the same public URL.",
      });
    }
  }

  // 4. Missing database URL explains a 500 from signup and a silent login reject.
  if (!input.databaseUrl?.trim()) {
    issues.push({
      code: "DATABASE_URL_MISSING",
      severity: "error",
      message: "DATABASE_URL is not set on this deployment, so every user lookup fails.",
      fix: "Add the Supabase connection string (direct :5432 for migrations, pooler with ?pgbouncer=true&connection_limit=1 for serverless).",
    });
  }

  return issues;
}

export type AuthSummary = {
  ok: boolean;
  secretConfigured: boolean;
  secretLength: number;
  nextAuthUrl: string | null;
  publicSiteUrl: string | null;
  databaseUrlConfigured: boolean;
  issues: HealthIssue[];
};

/** The safe-to-expose view: no secret values, just shape and names. */
export function summariseAuthConfig(input: AuthConfigInput): AuthSummary {
  const issues = evaluateAuthConfig(input);
  const secret = input.secret?.trim() ?? "";
  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    secretConfigured: secret.length > 0,
    secretLength: secret.length,
    nextAuthUrl: normaliseUrl(input.nextAuthUrl),
    publicSiteUrl: normaliseUrl(input.publicSiteUrl),
    databaseUrlConfigured: Boolean(input.databaseUrl?.trim()),
    issues,
  };
}

export type DatabaseProblem =
  | "paused-project"
  | "unreachable"
  | "credentials"
  | "missing-tables"
  | "missing-columns"
  | "unknown";

/** Turns a Prisma/Postgres error message into a category plus a next step. */
export function classifyDatabaseError(message: string): {
  problem: DatabaseProblem;
  hint: string;
} {
  const text = message || "";

  if (/tenant\/user .*not found|project .*not found/i.test(text)) {
    return {
      problem: "paused-project",
      hint: "The Supabase project looks paused or the connection string is stale. Open the Supabase dashboard, resume the project, then copy the connection string again.",
    };
  }
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|P1001|P1008|connection.*(closed|timeout)/i.test(text)) {
    return {
      problem: "unreachable",
      hint: "Database unreachable — check DATABASE_URL, the region in the host name, and that the database is running.",
    };
  }
  if (/P1000|authentication failed|password authentication failed/i.test(text)) {
    return {
      problem: "credentials",
      hint: "The database rejected the credentials in DATABASE_URL. Reset the database password in Supabase and update the env var.",
    };
  }
  if (/P2021|relation .* does not exist|table .* does not exist/i.test(text)) {
    return {
      problem: "missing-tables",
      hint: "The database is reachable but empty — run `npm run db:deploy` (or `db:setup`) against this database.",
    };
  }
  if (/P2022|column .* does not exist/i.test(text)) {
    return {
      problem: "missing-columns",
      hint: "The database is behind the code — a migration is missing. Run `npm run db:deploy` against this database, then restart the app.",
    };
  }
  return {
    problem: "unknown",
    hint: "Check the server logs for the full Prisma error.",
  };
}

/** One word for the top of a health response. */
export function overallStatus(parts: {
  databaseUp: boolean;
  authOk: boolean;
  schemaOk: boolean;
}): "ok" | "degraded" {
  return parts.databaseUp && parts.authOk && parts.schemaOk ? "ok" : "degraded";
}
