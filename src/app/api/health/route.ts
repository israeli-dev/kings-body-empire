import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  classifyDatabaseError,
  overallStatus,
  summariseAuthConfig,
} from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Deployment health check.
 *
 *   GET /api/health          → 200 always (status "ok" or "degraded")
 *   GET /api/health?strict=1 → 503 when anything is broken
 *
 * It answers the three questions that actually break a deploy:
 *   1. Is the database reachable?                    → database
 *   2. Does the database match the code (columns)?    → schema
 *   3. Is Auth configured for THIS host?              → auth
 *
 * No secrets, connection strings or stack traces are ever returned — only
 * whether something is configured and what to do about it. Safe to leave public
 * and to point Render/Vercel health checks at.
 */
export async function GET(req: Request) {
  const strict = new URL(req.url).searchParams.get("strict") === "1";

  // ---- 1. Database reachable -------------------------------------------------
  let database: "up" | "down" = "down";
  let databaseError: string | null = null;
  let databaseErrorCode: string | null = null;
  let databaseHint: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "up";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const diagnosis = classifyDatabaseError(message);
    databaseError = diagnosis.problem;
    databaseErrorCode = diagnosis.code;
    databaseHint = diagnosis.hint;
    // Full detail belongs in the platform log, not a public response.
    console.error(`[health] database ${diagnosis.problem} (${diagnosis.code ?? "no code"}):`, message);
  }

  // ---- 2. Schema matches the code -------------------------------------------
  // `SELECT 1` succeeds on an empty database, which is how "healthy" deployments
  // ended up failing on the first real query. Touch a table and a recent column.
  let schema: "current" | "missing" | "unknown" = "unknown";
  let schemaHint: string | null = null;

  if (database === "up") {
    try {
      await prisma.user.findFirst({ select: { id: true, referralBonusDays: true } });
      schema = "current";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const diagnosis = classifyDatabaseError(message);
      schema = "missing";
      schemaHint = diagnosis.hint;
      console.error("[health] schema check failed:", message);
    }
  }

  // ---- 3. Auth configured for this host -------------------------------------
  const requestHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    req.headers.get("host");

  const auth = summariseAuthConfig({
    secret: process.env.NEXTAUTH_SECRET,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    publicSiteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    databaseUrl: process.env.DATABASE_URL,
    requestHost,
    isProduction: process.env.NODE_ENV === "production",
  });

  const status = overallStatus({
    databaseUp: database === "up",
    authOk: auth.ok,
    schemaOk: schema === "current",
  });

  const body = {
    status,
    service: "kings-body-empire",
    database,
    databaseError,
    databaseErrorCode,
    databaseHint,
    schema,
    schemaHint,
    auth,
    // Helpful when debugging a deploy: which build is live.
    commit:
      process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
      process.env.RENDER_GIT_COMMIT?.slice(0, 7) ??
      null,
    region: process.env.VERCEL_REGION ?? process.env.RENDER_REGION ?? null,
    environment: process.env.NODE_ENV ?? null,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: strict && status !== "ok" ? 503 : 200 });
}
