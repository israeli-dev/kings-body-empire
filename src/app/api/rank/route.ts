import { NextResponse } from "next/server";
import { getCurrentUser, serverError, unauthorized } from "@/lib/api";
import { getRankOverview } from "@/lib/rank";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const overview = await getRankOverview(user.id);
    return NextResponse.json(overview);
  } catch {
    return serverError("Could not load your rank.");
  }
}
