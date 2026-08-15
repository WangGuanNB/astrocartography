/**
 * Server-side GA4 Measurement Protocol events for completed checkout flows.
 * Reporting is deliberately best-effort: payment state must never depend on GA4.
 */

type PaymentProvider = "creem" | "stripe" | "paypal";

type PaymentEventInput = {
  provider: PaymentProvider;
  transactionId: string;
  amount: number;
  currency?: string | null;
  productId?: string | null;
  productName?: string | null;
  gaClientId?: string | null;
};

const REPORT_TIMEOUT_MS = 800;

export function getGaClientIdFromRequest(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  const value = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("_ga="))
    ?.slice(4);

  if (!value) return undefined;

  let decodedValue: string;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    // A malformed analytics cookie must never block checkout creation.
    return undefined;
  }

  const parts = decodedValue.split(".");
  const clientId = parts.slice(-2).join(".");
  return /^\d+\.\d+$/.test(clientId) ? clientId : undefined;
}

export function getGaClientIdFromOrderDetail(orderDetail?: string | null): string | undefined {
  if (!orderDetail) return undefined;

  try {
    const value = JSON.parse(orderDetail)?.ga_client_id;
    return typeof value === "string" && /^\d+\.\d+$/.test(value)
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function fallbackClientId(transactionId: string): string {
  let hash = 0;
  for (let index = 0; index < transactionId.length; index += 1) {
    hash = (hash * 31 + transactionId.charCodeAt(index)) >>> 0;
  }
  return `${Math.max(hash, 1)}.1`;
}

async function reportPaymentEvent(
  name: "checkout_created" | "purchase",
  input: PaymentEventInput
) {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
  const apiSecret = process.env.GA4_MEASUREMENT_PROTOCOL_API_SECRET;

  if (!measurementId || !apiSecret) {
    console.warn("[GA4 Server Event] skipped: Measurement Protocol is not configured", {
      name,
      provider: input.provider,
      transactionId: input.transactionId,
    });
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);
  const value = Number((input.amount / 100).toFixed(2));

  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          client_id: input.gaClientId || fallbackClientId(input.transactionId),
          events: [
            {
              name,
              params: {
                transaction_id: input.transactionId,
                currency: (input.currency || "USD").toUpperCase(),
                value,
                payment_provider: input.provider,
                engagement_time_msec: 1,
                items: [
                  {
                    item_id: input.productId || input.transactionId,
                    item_name: input.productName || "Astrocartography credits",
                    price: value,
                    quantity: 1,
                  },
                ],
              },
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.warn("[GA4 Server Event] rejected", {
        name,
        provider: input.provider,
        transactionId: input.transactionId,
        status: response.status,
      });
      return false;
    }

    console.log("[GA4 Server Event] sent", {
      name,
      provider: input.provider,
      transactionId: input.transactionId,
    });
    return true;
  } catch (error) {
    console.warn("[GA4 Server Event] failed", {
      name,
      provider: input.provider,
      transactionId: input.transactionId,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export function reportCheckoutCreated(input: PaymentEventInput) {
  return reportPaymentEvent("checkout_created", input);
}

export function reportPurchase(input: PaymentEventInput) {
  return reportPaymentEvent("purchase", input);
}
