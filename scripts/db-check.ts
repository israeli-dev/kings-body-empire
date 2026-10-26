/**
 * `npm run db:check`
 *
 * Prints a redacted view of DATABASE_URL, flags the usual configuration
 * mistakes, then tries a real connection and reports whether the schema has
 * been created. Nothing is written to the database.
 *
 * Flags:
 *   --soft     exit 0 even when problems are found (used before seeding)
 *   --offline  skip the live connection attempt
 */
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  diagnoseConnectionError,
  inspectDatabaseUrl,
  parseDatabaseUrl,
  type DiagnosticIssue,
} from "../src/lib/db-diagnostics";

const C = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  cyan: "\u001b[36m",
};

const args = new Set(process.argv.slice(2));
const soft = args.has("--soft");
const offline = args.has("--offline");

function line(text = "") {
  console.log(text);
}

function heading(text: string) {
  line(`${C.bold}${text}${C.reset}`);
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
      if (process.env[key] !== undefined) continue; // real env wins
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

function printIssues(issues: DiagnosticIssue[]) {
  const order: Record<string, number> = { error: 0, warn: 1, info: 2 };
  const sorted = [...issues].sort((a, b) => order[a.severity] - order[b.severity]);
  for (const issue of sorted) {
    const label =
      issue.severity === "error"
        ? `${C.red}✗${C.reset}`
        : issue.severity === "warn"
          ? `${C.yellow}!${C.reset}`
          : `${C.cyan}i${C.reset}`;
    line(`  ${label} ${C.bold}${issue.title}${C.reset}`);
    if (issue.detail) line(`    ${C.dim}${issue.detail}${C.reset}`);
    for (const fix of issue.fixes ?? []) line(`      • ${fix}`);
  }
}

async function main() {
  line();
  heading("Kings Body Empire — database check");
  line();

  const envFile = loadEnvFile();
  const url = process.env.DATABASE_URL;
  line(`${C.dim}env file:${C.reset} ${envFile ?? "(none found — using shell environment)"}`);

  if (!url) {
    line(`  ${C.red}✗${C.reset} DATABASE_URL is not set.`);
    line("      • Copy the template:  cp .env.example .env");
    line('      • Then set DATABASE_URL="postgresql://…"');
    process.exitCode = 1;
    return;
  }

  const info = parseDatabaseUrl(url);
  if (!info) {
    line(`  ${C.red}✗${C.reset} DATABASE_URL could not be parsed.`);
    line("      • It must start with postgresql:// (or postgres://).");
    line("      • URL-encode special characters in the password: @ → %40, # → %23, / → %2F");
    process.exitCode = 1;
    return;
  }

  line(`${C.dim}target:${C.reset}   ${info.redacted}`);
  line(`${C.dim}server:${C.reset}   ${info.host}:${info.port}   ${C.dim}database:${C.reset} ${info.database}`);
  line();

  const issues = inspectDatabaseUrl(info, url);
  if (issues.length > 0) {
    heading("Configuration notes");
    printIssues(issues);
    line();
  } else {
    line(`${C.green}✓${C.reset} Connection string looks well formed.`);
    line();
  }

  const blocking = issues.some((issue) => issue.severity === "error");

  if (offline) {
    line(`${C.dim}Skipped the live connection (--offline).${C.reset}`);
    line();
  } else {
    heading("Connecting…");
    const prisma = new PrismaClient({ datasourceUrl: url, log: [] });
    let connectError: string | null = null;

    try {
      await prisma.$queryRaw`SELECT 1`;
      line(`  ${C.green}✓${C.reset} Connected to ${info.host}:${info.port}`);
    } catch (error) {
      connectError = error instanceof Error ? error.message : String(error);
    }

    if (connectError) {
      const diagnosis = diagnoseConnectionError(connectError, info);
      line(`  ${C.red}✗ ${diagnosis.title}${C.reset}`);
      line(`    ${diagnosis.summary}`);
      line();
      heading("How to fix it");
      for (const fix of diagnosis.fixes) line(`  • ${fix}`);
      line();
      line(`${C.dim}Raw error:${C.reset}`);
      line(`${C.dim}${connectError.split("\n").slice(0, 6).join("\n")}${C.reset}`);
      line();
      await prisma.$disconnect().catch(() => undefined);
      process.exitCode = 1;
      return;
    }

    try {
      const migrationTable = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = '_prisma_migrations'
        ) AS exists`;

      if (!migrationTable[0]?.exists) {
        line();
        heading("Schema");
        line(`  ${C.yellow}!${C.reset} No migrations found on this database.`);
        line("      • Run `npm run db:migrate` (or `npm run db:deploy` in production).");
      } else {
        const counts = await prisma.$queryRaw<{ users: bigint; lessons: bigint }[]>`
          SELECT
            (SELECT COUNT(*) FROM "User") AS users,
            (SELECT COUNT(*) FROM "EducationContent") AS lessons`;

        const users = Number(counts[0]?.users ?? 0);
        const lessons = Number(counts[0]?.lessons ?? 0);

        line();
        heading("Schema");
        line(`  ${C.green}✓${C.reset} Migrations applied — ${users} user(s), ${lessons} lesson(s)`);
        if (users === 0) {
          line("      • Nothing seeded yet — run `npm run db:seed`.");
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const diagnosis = diagnoseConnectionError(message, info);
      line();
      heading("Schema");
      line(`  ${C.yellow}!${C.reset} ${diagnosis.title}`);
      for (const fix of diagnosis.fixes) line(`      • ${fix}`);
    } finally {
      await prisma.$disconnect().catch(() => undefined);
    }
    line();
  }

  if (blocking) {
    line(`${C.red}Fix the errors above, then run this check again.${C.reset}`);
    line();
    process.exitCode = 1;
    return;
  }

  line(`${C.green}${C.bold}Database configuration looks usable.${C.reset}`);
  line(`${C.dim}Next: npm run db:migrate  →  npm run db:seed  →  npm run dev${C.reset}`);
  line();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (soft && process.exitCode === 1) {
      // --soft: report but do not block the caller.
      process.exitCode = 0;
    }
  });
