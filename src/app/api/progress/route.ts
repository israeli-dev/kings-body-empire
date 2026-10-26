import { NextResponse } from "next/server";
import { getCurrentUser, serverError, unauthorized } from "@/lib/api";
import { getProgress } from "@/lib/progress";
import { parseRange } from "@/lib/progress-core";

/**
 * GET /api/progress?range=30|90
 * Weight, weekly volume, calories, activity heatmap and streak stats.
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const range = parseRange(new URL(req.url).searchParams.get("range"));

  try {
    const progress = await getProgress(user.id, range);
    return NextResponse.json(progress);
  } catch {
    return serverError("Could not load your progress.");
  }
}
