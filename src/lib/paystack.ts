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
  /** Omitted when a `plan` is supplied — Paystack takes the amount from the plan. */
  amountKobo?: number;
  /** Paystack plan code (`pln_…`) — turns the charge into a subscription. */
  plan?: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return paystackFetch<InitializeResult>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      ...(input.plan ? { plan: input.plan } : {}),
      ...(input.plan || typeof input.amountKobo !== "number"
        ? {}
        : { amount: input.amountKobo }),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata ?? {},
      channels: ["card", "bank", "ussd", "bank_transfer"],
    }),
  });
}

export type PlanResult = {
  plan_code: string;
  name: string;
  amount: number;
  interval: string;
};

/** Creates a monthly plan. One plan per price point: a price change needs a new one. */
export async function createPlan(input: {
  name: string;
  amountKobo: number;
  interval?: "monthly" | "annually" | "quarterly" | "biannually";
  description?: string;
}) {
  return paystackFetch<PlanResult>("/plan", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      amount: input.amountKobo,
      interval: input.interval ?? "monthly",
      description: input.description,
      currency: "NGN",
    }),
  });
}

export type PaystackSubscription = {
  subscription_code: string;
  email_token: string;
  status: string;
  amount: number;
  next_payment_date?: string | null;
  plan?: { plan_code?: string; name?: string; amount?: number } | null;
  customer?: { email?: string; customer_code?: string } | null;
};

/** Lists subscriptions, usually filtered by customer email or plan code. */
export async function listSubscriptions(filter: {
  customer?: string;
  plan?: string;
}) {
  const params = new URLSearchParams();
  if (filter.customer) params.set("customer", filter.customer);
  if (filter.plan) params.set("plan", filter.plan);
  const query = params.toString();
  return paystackFetch<PaystackSubscription[]>(
    `/subscription${query ? `?${query}` : ""}`,
    { method: "GET" },
  );
}

/** Cancels billing. Paystack calls this "disable"; the current period is honoured. */
export async function disableSubscription(input: { code: string; token: string }) {
  return paystackFetch<{ status?: string }>("/subscription/disable", {
    method: "POST",
    body: JSON.stringify({ code: input.code, token: input.token }),
  });
}

/** Turns billing back on before the paid period runs out. */
export async function enableSubscription(input: { code: string; token: string }) {
  return paystackFetch<{ status?: string }>("/subscription/enable", {
    method: "POST",
    body: JSON.stringify({ code: input.code, token: input.token }),
  });
}

export type VerifyResult = {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer?: { email?: string; customer_code?: string };
  plan?: { plan_code?: string } | string | null;
  metadata?: Record<string, unknown> | string | null;
};

export async function verifyPayment(reference: string) {
  return paystackFetch<VerifyResult>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    { method: "GET" },
  );
}
