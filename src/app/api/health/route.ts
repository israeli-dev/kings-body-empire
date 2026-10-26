import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Deployment health check.
 *
 *   GET /api/health          → 200 always ("ok" or "degraded")
 *   GET /api/health?strict=1 → 503 when the database is unreachable
 *
 * Render/Vercel can poll the plain URL: a restart will not fix a paused
 * database, so the process stays up and the payload tells you what is wrong.
 * No secrets or connection strings are ever included.
 */
export async function GET(req: Request) {
  const strict = new URL(req.url).searchParams.get("strict") === "1";

  let database: "up" | "down" = "down";
  let databaseError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Keep the reason short and free of connection details.
    if (/tenant\/user .* not found/i.test(message)) {
      databaseError = "Supabase project not found — is it paused or is the connection string stale?";
    } else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|P1001|P1008/i.test(message)) {
      databaseError = "Database unreachable — check DATABASE_URL and that the database is running.";
    } else if (/P1000|authentication failed/i.test(message)) {
      databaseError = "Database rejected the credentials in DATABASE_URL.";
    } else if (/P2021|does not exist/i.test(message)) {
      databaseError = "Database reachable but tables are missing — run the migrations.";
    } else {
      databaseError = "Database query failed.";
    }
  }

  const ok = database === "up";
  const body = {
    status: ok ? "ok" : "degraded",
    service: "kings-body-empire",
    database,
    databaseError,
    // Helpful when debugging a deploy: which build is live.
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
      null,
    region: process.env.VERCEL_REGION ?? process.env.RENDER_REGION ?? null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: strict && !ok ? 503 : 200 });
}
