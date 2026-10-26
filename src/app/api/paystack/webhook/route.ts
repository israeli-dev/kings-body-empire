import { NextResponse } from "next/server";
import { paystackSecretKey } from "@/lib/env";
import { markPurchasePaid } from "@/lib/purchases";
import { verifyPaystackSignature } from "@/lib/paystack-signature";
import {
  handleInvoiceEvent,
  handleSubscriptionEvent,
  type SubscriptionWebhookData,
} from "@/lib/subscriptions";

type WebhookBody = {
  event?: string;
  data?: Record<string, unknown> | null;
};

/**
 * Paystack webhook — the reliable source of truth for "money actually arrived"
 * and for subscription state.
 *
 * Events handled:
 *   charge.success                      first charge and renewals
 *   subscription.create                 link the Paystack plan to a client
 *   subscription.not_renew/disable/enable
 *   invoice.create/update/payment_failed
 *
 * Point the Paystack dashboard webhook URL at /api/paystack/webhook.
 */
export async function POST(req: Request) {
  const secret = paystackSecretKey();
  if (!secret) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyPaystackSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = JSON.parse(rawBody) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event ?? "";
  const data = (body.data ?? {}) as Record<string, unknown>;

  try {
    if (event === "charge.success" && typeof data.reference === "string") {
      await markPurchasePaid(data.reference, typeof data.amount === "number" ? data.amount : 0);
    } else if (event.startsWith("subscription.")) {
      await handleSubscriptionEvent(event, data as SubscriptionWebhookData);
    } else if (event.startsWith("invoice.")) {
      await handleInvoiceEvent(event, data);
    }
  } catch (error) {
    // Log and still answer 200: Paystack retries forever otherwise, and a
    // retry storm is worse than a single missed event we can replay by hand.
    console.error(`[paystack] ${event} handler failed:`, error);
  }

  // Always 200 so Paystack stops retrying.
  return NextResponse.json({ received: true });
}
