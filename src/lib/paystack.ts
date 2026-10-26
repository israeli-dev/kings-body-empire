import { paystackSecretKey } from "./env";

const PAYSTACK_BASE = "https://api.paystack.co";

type PaystackError = { message: string };

async function paystackFetch<T>(
  path: string,
  init: RequestInit & { body?: string } = {},
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const secret = paystackSecretKey();
  if (!secret) {
    return { ok: false, message: "Payments are not configured on this deployment." };
  }

  try {
    const res = await fetch(`${PAYSTACK_BASE}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    const payload = (await res.json().catch(() => null)) as
      | { status?: boolean; message?: string; data?: T }
      | null;

    if (!res.ok || !payload?.status || !payload.data) {
      return {
        ok: false,
        message: payload?.message || (payload as PaystackError | null)?.message || "Paystack request failed.",
      };
    }

    return { ok: true, data: payload.data };
  } catch {
    return { ok: false, message: "Could not reach Paystack. Check your connection and try again." };
  }
}

export type InitializeResult = {
  authorization_url: string;
  access_code: string;
  reference: string;
};

export async function initializePayment(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return paystackFetch<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  });
}

export type VerifyResult = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer?: { email?: string };
  metadata?: Record<string, unknown> | string | null;
};

export async function verifyPayment(reference: string) {
  return paystackFetch<VerifyResult>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}
