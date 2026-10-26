import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  getCurrentUser,
  readJson,
  serverError,
  unauthorized,
} from "@/lib/api";
import { paymentsEnabled } from "@/lib/env";
import {
  cancelSubscription,
  getUserSubscriptions,
  packageIdsWithAccess,
  reactivateSubscription,
} from "@/lib/subscriptions";
import { oneOf, parseText } from "@/lib/validation";

/** The client's own subscriptions, plus the program ids they can open today. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const [subscriptions, access] = await Promise.all([
      getUserSubscriptions(user.id),
      packageIdsWithAccess(user.id),
    ]);
    return NextResponse.json({ subscriptions, access });
  } catch {
    return serverError("Could not load your subscriptions.");
  }
}

/**
 * Cancels or reactivates one subscription.
 * Cancelling keeps access until the paid period ends — Paystack is asked first
 * so the local record never claims billing stopped when it did not.
 */
export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!user.email) return forbidden();

  const body = await readJson(req);
  if (!body) return badRequest("Send a JSON body with id and action.");

  const id = parseText(body.id, { min: 1, max: 60 });
  const action = oneOf(body.action, ["cancel", "reactivate"] as const);
  if (!id || !action) return badRequest("Tell us which subscription and what to do with it.");

  if (!paymentsEnabled()) {
    return badRequest(
      "Payments are not configured on this deployment, so subscriptions cannot be changed here.",
      503,
    );
  }

  try {
    const result =
      action === "cancel"
        ? await cancelSubscription(user.id, id)
        : await reactivateSubscription(user.id, id);

    if (!result.ok) return badRequest(result.message, 400);

    const subscriptions = await getUserSubscriptions(user.id);
    return NextResponse.json({
      status: result.status,
      subscriptions,
      message:
        action === "cancel"
          ? "Billing stopped. You keep access until the end of the period you paid for."
          : "Billing resumed — your next renewal will go ahead.",
    });
  } catch {
    return serverError("Could not update that subscription.");
  }
}
