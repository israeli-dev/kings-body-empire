import { NextResponse } from "next/server";
import { getCurrentUser, serverError, unauthorized } from "@/lib/api";
import { getReferralOverview } from "@/lib/referrals";

/** The signed-in client's referral code, share link and invite history. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    return NextResponse.json(await getReferralOverview(user.id));
  } catch {
    return serverError("Could not load your referral details.");
  }
}
