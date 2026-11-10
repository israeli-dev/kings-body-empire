/**
 * `npm run doctor`
 * `npm run doctor -- https://your-deployed-site.example`
 *
 * Two modes, because the two halves of this problem look identical from the
 * browser:
 *
 *   local  — reads .env, checks the auth variables, and reports whether they
 *            would survive a production deploy
 *   remote — fetches <url>/api/health from the deployed site and prints what is
 *            actually wrong there (paused database, missing secret, host
 *            mismatch, migrations not applied)
 *
 * Nothing here writes to the database and no secret value is ever printed.
 * Exit code is 1 when an error is found, so it can gate a deploy.
 */
import fs from "node:fs";
import path from "node:path";
import {
  describeDatabaseTarget,
  evaluateAuthConfig,
  summariseAuthConfig,
  type DatabaseTarget,
  type HealthIssue,
} from "../src/lib/health";

const C = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
};

type HealthPayload = {
  status?: string;
  database?: string;
  databaseTarget?: DatabaseTarget;
  databaseError?: string | null;
  databaseErrorCode?: string | null;
  databaseHint?: string | null;
  schema?: string;
  schemaHint?: string | null;
  auth?: {
    ok?: boolean;
    secretConfigured?: boolean;
    secretLength?: number;
    nextAuthUrl?: string | null;
    publicSiteUrl?: string | null;
    databaseUrlConfigured?: boolean;
    issues?: HealthIssue[];
  };
  commit?: string | null;
  environment?: string | null;
  timestamp?: string;
};

function heading(text: string) {
  console.log(`\n${C.bold}${text}${C.reset}`);
}

function ok(text: string) {
  console.log(`  ${C.green}✓${C.reset} ${text}`);
}

function bad(text: string) {
  console.log(`  ${C.red}✗${C.reset} ${text}`);
}

function warn(text: string) {
  console.log(`  ${C.yellow}!${C.reset} ${text}`);
}

function info(text: string) {
  console.log(`  ${C.cyan}i${C.reset} ${text}`);
}

/** Minimal .env reader: real env vars win, like Prisma and Next.js. */
function loadEnvFile(): string | null {
  for (const filename of [".env.local", ".env"]) {
    const file = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(rawLine);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "");
      }
      process.env[key] = value;
    }
    return filename;
  }
  return null;
}

/**
 * Route-group collision check. Folders in parentheses don't appear in the
 * URL, so `src/app/(auth)/page.tsx` and `src/app/(marketing)/page.tsx` both
 * claim `/` and Next dies with "You cannot have two parallel pages that
 * resolve to the same path". That file is never in git (tests/routes.test.ts
 * guards the repo) — if this fires locally, the extra file is a stray in
 * your working tree: delete it, don't commit it.
 */
function findRouteClashes(): { route: string; files: string[] }[] {
  const appDir = path.resolve(process.cwd(), "src", "app");
  if (!fs.existsSync(appDir)) return [];
  const pageFiles = new Set(["page.tsx", "page.ts", "page.jsx", "page.js"]);
  const byRoute = new Map<string, string[]>();

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir)) {
      if (entry.startsWith(".")) continue;
      const full = path.join(dir, entry);
      if (fs.statSync(full).isDirectory()) {
        walk(full);
      } else if (pageFiles.has(entry)) {
        const segments = path
          .relative(appDir, path.dirname(full))
          .split(path.sep)
          .filter((s) => s && !(s.startsWith("(") && s.endsWith(")")));
        const route = `/${segments.join("/")}`.replace(/\/$/, "") || "/";
        byRoute.set(route, [...(byRoute.get(route) ?? []), path.relative(process.cwd(), full)]);
      }
    }
  };
  walk(appDir);

  return [...byRoute.entries()]
    .filter(([, files]) => files.length > 1)
    .map(([route, files]) => ({ route, files }));
}

function printIssues(issues: HealthIssue[]) {
  for (const issue of issues) {
    if (issue.severity === "error") bad(`${issue.message}`);
    else warn(`${issue.message}`);
    console.log(`      ${C.dim}→ ${issue.fix}${C.reset}`);
  }
}

async function checkLocal() {
  const envFile = loadEnvFile();

  console.log(`${C.bold}Kings Body Empire — deploy doctor${C.reset}`);
  console.log(`${C.dim}mode:${C.reset} local   ${C.dim}env file:${C.reset} ${envFile ?? "(none — using shell environment)"}`);

  // Treat local as a dry run of production: the mistakes that break a deploy
  // should be visible before you push.
  const input = {
    secret: process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    databaseUrl: process.env.DATABASE_URL,
    requestHost: null,
    isProduction: true,
  };

  const issues = evaluateAuthConfig(input);
  const summary = summariseAuthConfig(input);

  heading("Auth configuration (as a production deploy would see it)");
  if (summary.secretConfigured) {
    ok(`NEXTAUTH_SECRET is set (${summary.secretLength} characters)`);
  } else {
    bad("NEXTAUTH_SECRET is missing");
  }
  if (summary.nextAuthUrl) ok(`NEXTAUTH_URL = ${summary.nextAuthUrl}`);
  else bad("NEXTAUTH_URL is missing");
  if (summary.publicSiteUrl) ok(`NEXT_PUBLIC_SITE_URL = ${summary.publicSiteUrl}`);
  else warn("NEXT_PUBLIC_SITE_URL is missing (reset links and Paystack callbacks fall back)");
  if (summary.databaseUrlConfigured) ok("DATABASE_URL is set");
  else bad("DATABASE_URL is missing");

  const url = summary.nextAuthUrl;
  if (url) {
    const host = new URL(url.includes("://") ? url : `https://${url}`).hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      info("NEXTAUTH_URL is localhost — correct for development, but the deployed site needs its own URL.");
    } else if (!url.startsWith("https://")) {
      warn("NEXTAUTH_URL is not https — production cookies are secure-only and will be dropped.");
    }
  }

  heading("App routes");
  const clashes = findRouteClashes();
  if (clashes.length === 0) {
    ok("no two pages resolve to the same URL");
  } else {
    for (const clash of clashes) {
      bad(`${clash.route} is defined by ${clash.files.join(" and ")}`);
      console.log(
        `      ${C.dim}→ Route groups like (auth) don't appear in the URL. Delete the stray file (it is not part of the repo), then: rm -rf .next && npm run dev${C.reset}`,
      );
    }
  }

  const errors = [
    ...issues.filter((issue) => issue.severity === "error"),
    ...clashes.map(
      (clash): HealthIssue => ({
        code: "ROUTE_CLASH",
        severity: "error",
        message: `${clash.route} is defined by ${clash.files.join(" and ")}`,
        fix: "Delete the stray page file, then rm -rf .next and restart the dev server.",
      }),
    ),
  ];
  if (issues.filter((issue) => issue.severity === "error").length > 0) {
    heading("Problems to fix before deploying");
    printIssues(issues.filter((issue) => issue.severity === "error"));
  }

  const warnings = issues.filter((issue) => issue.severity === "warn");
  if (warnings.length > 0) {
    heading("Worth tightening");
    printIssues(warnings);
  }

  heading("Next");
  if (errors.length === 0) {
    ok("Local environment looks deployable.");
    console.log(
      `  ${C.dim}Check the deployed site itself:${C.reset} npm run doctor -- https://your-site.example`,
    );
    console.log(`  ${C.dim}Check the database:${C.reset}            npm run db:check`);
  } else {
    console.log(`  Fix the ${errors.length} error(s) above, then run this again.`);
    console.log(`  ${C.dim}Generate a secret:${C.reset} openssl rand -base64 32`);
  }

  return errors.length === 0;
}

async function checkRemote(rawUrl: string) {
  const base = rawUrl.replace(/\/+$/, "");
  const endpoint = `${base}/api/health`;

  console.log(`${C.bold}Kings Body Empire — deploy doctor${C.reset}`);
  console.log(`${C.dim}mode:${C.reset} remote   ${C.dim}target:${C.reset} ${base}\n`);

  let payload: HealthPayload;
  try {
    const res = await fetch(endpoint, {
      headers: { "user-agent": "kbe-doctor" },
      cache: "no-store",
    });
    if (!res.ok && res.status !== 503) {
      bad(`${endpoint} returned HTTP ${res.status}`);
      console.log(
        `  ${C.dim}Is the deployment running? A 404 here usually means the build never finished.${C.reset}`,
      );
      return false;
    }
    payload = (await res.json()) as HealthPayload;
  } catch (error) {
    bad(`Could not reach ${endpoint}`);
    console.log(`  ${C.dim}${error instanceof Error ? error.message : String(error)}${C.reset}`);
    return false;
  }

  let failures = 0;

  heading("Deployment");
  console.log(
    `  status: ${payload.status === "ok" ? `${C.green}ok${C.reset}` : `${C.red}${payload.status ?? "unknown"}${C.reset}`}` +
      `   commit: ${payload.commit ?? "unknown"}   env: ${payload.environment ?? "unknown"}`,
  );

  heading("Database");
  const remoteTarget = payload.databaseTarget;
  const localTarget = describeDatabaseTarget(process.env.DATABASE_URL);

  if (remoteTarget) {
    if (!remoteTarget.configured) {
      bad("DATABASE_URL is not set on this deployment");
    } else {
      console.log(
        `  ${C.dim}connection:${C.reset} ${remoteTarget.kind}` +
          (remoteTarget.port ? ` on port ${remoteTarget.port}` : ""),
      );
      if (remoteTarget.likelyIpv6Only) {
        bad(
          "DATABASE_URL uses the direct Supabase host (db.<ref>.supabase.co), which is IPv6-only for new projects and unreachable from most hosts",
        );
        console.log(
          `      ${C.dim}→ Use the pooler host instead: Supabase → Project Settings → Database → Connection pooling.${C.reset}`,
        );
      }
      if (remoteTarget.kind === "invalid") {
        bad(
          "DATABASE_URL is not a valid postgresql:// URL on this deployment (quotes around the value are the usual cause)",
        );
      }
      if (localTarget.configured && localTarget.kind !== remoteTarget.kind) {
        warn(
          `this machine connects as ${localTarget.kind} (:${localTarget.port}) but the deployment connects as ${remoteTarget.kind} — copy the value that works locally onto the host.`,
        );
      }
    }
  } else {
    warn("this deployment runs an older build without connection details — redeploy from main");
  }

  if (payload.database === "up") {
    ok("reachable");
  } else {
    failures += 1;
    const code = payload.databaseErrorCode ? ` · ${payload.databaseErrorCode}` : "";
    bad(`unreachable (${payload.databaseError ?? "unknown"}${code})`);
    if (payload.databaseHint) console.log(`      ${C.dim}→ ${payload.databaseHint}${C.reset}`);
  }

  heading("Schema");
  if (payload.schema === "current") {
    ok("matches the code (users table and recent columns present)");
  } else {
    failures += 1;
    bad(`migrations missing on this database (${payload.schema ?? "unknown"})`);
    if (payload.schemaHint) console.log(`      ${C.dim}→ ${payload.schemaHint}${C.reset}`);
    console.log(
      `      ${C.dim}→ Run against the production database:${C.reset} DATABASE_URL="<prod url>" npm run db:deploy`,
    );
  }

  heading("Auth");
  if (payload.auth) {
    if (payload.auth.secretConfigured) ok(`NEXTAUTH_SECRET is set (${payload.auth.secretLength} chars)`);
    else {
      failures += 1;
      bad("NEXTAUTH_SECRET is missing — sign-in cannot work");
    }
    console.log(`  ${C.dim}NEXTAUTH_URL:${C.reset} ${payload.auth.nextAuthUrl ?? "(unset)"}`);
    console.log(`  ${C.dim}SITE_URL:${C.reset}     ${payload.auth.publicSiteUrl ?? "(unset)"}`);

    const issues = payload.auth.issues ?? [];
    if (issues.length > 0) {
      console.log("");
      printIssues(issues);
      failures += issues.filter((issue) => issue.severity === "error").length;
    }
  } else {
    warn("this deployment runs an older build without auth reporting — redeploy from main");
  }

  heading("Verdict");
  if (failures === 0 && payload.status === "ok") {
    ok("Everything the sign-in flow needs is in place.");
    console.log(
      `  ${C.dim}If login still fails, the password is genuinely wrong or the account was never created on this database.${C.reset}`,
    );
    return true;
  }

  bad(`${failures} blocking problem(s) — see the fixes above.`);
  console.log(
    `  ${C.dim}After changing environment variables, redeploy: the secret and URLs are read at build/start time.${C.reset}`,
  );
  return false;
}

async function main() {
  const target = process.argv.slice(2).find((arg) => !arg.startsWith("-"));
  const healthy = target ? await checkRemote(target) : await checkLocal();
  process.exitCode = healthy ? 0 : 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
