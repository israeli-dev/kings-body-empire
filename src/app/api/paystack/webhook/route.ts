import { NextResponse } from "next/server";
import { paystackSecretKey } from "@/lib/env";
import { markPurchasePaid } from "@/lib/purchases";
import { verifyPaystackSignature } from "@/lib/paystack-signature";

type WebhookBody = {
  event?: string;
  data?: { reference?: string; status?: string; amount?: number };
};

/**
 * Paystack webhook — the reliable source of truth for "money actually arrived".
 * Point your Paystack dashboard webhook URL at /api/paystack/webhook.
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

  const reference = body.data?.reference;
  if (!reference) return NextResponse.json({ received: true });

  if (body.event === "charge.success" && body.data?.status === "success") {
    await markPurchasePaid(reference, body.data.amount ?? 0);
  }

  // Always 200 so Paystack stops retrying.
  return NextResponse.json({ received: true });
}
