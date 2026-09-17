import { findOrderByOrderNo, getOrdersByUserUuid } from "@/models/order";
import { findLatestStripeSubscriptionByUser } from "@/models/subscription";
import type { orders } from "@/db/schema";
import type { Pricing } from "@/types/blocks/pricing";

export const PLUS_PRODUCT_IDS = new Set(["plus-monthly", "plus-yearly"]);

export type SubscriptionRolloutMode = "off" | "research" | "all";
export type SubscriptionPricingSurface = "general" | "research";

export function isPlusProductId(productId: string | null | undefined): boolean {
  if (!productId) return false;
  return PLUS_PRODUCT_IDS.has(productId);
}

export function isSubscriptionInterval(
  interval: string | null | undefined
): boolean {
  return interval === "month" || interval === "year";
}

export function isSubscriptionEnabled(): boolean {
  return process.env.NEXT_PUBLIC_SUBSCRIPTION_ENABLED === "true";
}

/**
 * Keep sale availability and marketing exposure separate.
 *
 * - off: checkout and pricing are unavailable
 * - research: Plus is shown only from an explicit high-intent research entry
 * - all: Plus is shown on general pricing surfaces too
 *
 * When subscriptions are enabled but no rollout mode is configured, default to
 * the narrower research audience so a deployment cannot accidentally expose
 * Plus site-wide.
 */
export function getSubscriptionRolloutMode(): SubscriptionRolloutMode {
  if (!isSubscriptionEnabled()) return "off";

  const configured = process.env.NEXT_PUBLIC_SUBSCRIPTION_ROLLOUT;
  if (configured === "all") return "all";
  return "research";
}

export function isSubscriptionVisible(
  surface: SubscriptionPricingSurface = "general"
): boolean {
  const mode = getSubscriptionRolloutMode();
  return mode === "all" || (mode === "research" && surface === "research");
}

/** Hide Plus unless the current surface belongs to the configured rollout. */
export function applySubscriptionPricingFilter(
  pricing: Pricing | undefined,
  options: { surface?: SubscriptionPricingSurface } = {}
): Pricing | undefined {
  if (
    !pricing?.items ||
    isSubscriptionVisible(options.surface ?? "general")
  ) {
    return pricing;
  }
  return {
    ...pricing,
    description:
      pricing.groups?.find((group) => group.name === "one-time")?.description ??
      pricing.description,
    items: pricing.items.filter((item) => !isPlusProductId(item.product_id)),
    groups: pricing.groups?.filter((g) => g.name !== "subscription"),
  };
}

type OrderRow = typeof orders.$inferSelect;

function isOrderSubscriptionActive(order: OrderRow, nowSec: number): boolean {
  if (!isPlusProductId(order.product_id)) return false;

  if (order.sub_period_end && order.sub_period_end > nowSec) {
    return true;
  }

  if (order.expired_at && new Date(order.expired_at).getTime() > Date.now()) {
    return true;
  }

  return false;
}

/** Latest active Plus subscription order for a user, if any. */
export async function getActivePlusSubscription(
  user_uuid: string
): Promise<OrderRow | null> {
  try {
    const stripeSubscription = await findLatestStripeSubscriptionByUser(user_uuid);
    if (stripeSubscription) {
      const linkedOrder = await findOrderByOrderNo(stripeSubscription.order_no);
      const statusIsEligible = ["active", "trialing", "past_due"].includes(
        stripeSubscription.status
      );
      const periodIsCurrent =
        !stripeSubscription.current_period_end ||
        stripeSubscription.current_period_end > Math.floor(Date.now() / 1000);
      return linkedOrder?.status === "paid" && statusIsEligible && periodIsCurrent
        ? linkedOrder
        : null;
    }
  } catch (error) {
    console.warn("subscription table unavailable; using legacy orders", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const paidOrders = await getOrdersByUserUuid(user_uuid);
  if (!paidOrders?.length) return null;

  const nowSec = Math.floor(Date.now() / 1000);

  for (const order of paidOrders) {
    if (isOrderSubscriptionActive(order, nowSec)) {
      return order;
    }
  }

  return null;
}

export function hasActivePlusSubscription(order: OrderRow | null): boolean {
  if (!order) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return isOrderSubscriptionActive(order, nowSec);
}

export interface ActiveSubscriptionSummary {
  product_id: string;
  product_name?: string | null;
  interval?: string | null;
  sub_period_end?: number | null;
  renewal_label?: string;
  is_active: boolean;
  provider?: string;
  status?: string;
  cancel_at_period_end?: boolean;
}

export async function getActivePlusSubscriptionSummary(
  user_uuid: string
): Promise<ActiveSubscriptionSummary | null> {
  // New Stripe lifecycle table. Fall back to legacy orders until the migration
  // is applied and for the existing grandfathered Creem subscriber.
  try {
    const subscription = await findLatestStripeSubscriptionByUser(user_uuid);
    const linkedOrder = subscription
      ? await findOrderByOrderNo(subscription.order_no)
      : null;
    const statusIsEligible = subscription
      ? ["active", "trialing", "past_due"].includes(subscription.status)
      : false;
    const periodIsCurrent =
      !subscription?.current_period_end ||
      subscription.current_period_end > Math.floor(Date.now() / 1000);
    if (subscription) {
      const isActive = Boolean(
        linkedOrder?.status === "paid" && statusIsEligible && periodIsCurrent
      );
      return {
        product_id: subscription.product_id,
        product_name: linkedOrder?.product_name,
        interval: subscription.interval,
        sub_period_end: subscription.current_period_end,
        renewal_label: subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000)
              .toISOString()
              .slice(0, 10)
          : undefined,
        is_active: isActive,
        provider: subscription.provider,
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    }
  } catch (error) {
    console.warn("subscription table unavailable; using legacy orders", {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const order = await getActivePlusSubscription(user_uuid);
  if (!order) return null;

  const renewal_label = order.sub_period_end
    ? new Date(order.sub_period_end * 1000).toISOString().slice(0, 10)
    : order.expired_at
      ? new Date(order.expired_at).toISOString().slice(0, 10)
      : undefined;

  return {
    product_id: order.product_id || "",
    product_name: order.product_name,
    interval: order.interval,
    sub_period_end: order.sub_period_end,
    renewal_label,
    is_active: true,
    provider: order.pay_type || "creem",
    status: "active",
    cancel_at_period_end: false,
  };
}

/** Parse Creem subscription fields from webhook payloads. */
export function extractCreemSubscriptionFields(data: any): {
  sub_id: string;
  sub_period_start: number;
  sub_period_end: number;
  customer_email: string;
  last_transaction_id: string;
} {
  const root = data?.object ?? data;
  const subscription =
    root?.subscription && typeof root.subscription === "object"
      ? root.subscription
      : root?.object === "subscription"
        ? root
        : root;

  const sub_id =
    subscription?.id ||
    root?.subscription?.id ||
    (typeof root?.subscription === "string" ? root.subscription : "") ||
    "";

  const periodStartRaw =
    subscription?.current_period_start_date ||
    subscription?.current_period_start ||
    root?.current_period_start_date;
  const periodEndRaw =
    subscription?.current_period_end_date ||
    subscription?.current_period_end ||
    root?.current_period_end_date;

  const sub_period_start = periodStartRaw
    ? Math.floor(new Date(periodStartRaw).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const sub_period_end = periodEndRaw
    ? Math.floor(new Date(periodEndRaw).getTime() / 1000)
    : sub_period_start + 30 * 24 * 60 * 60;

  const customer_email =
    root?.customer?.email ||
    subscription?.customer?.email ||
    data?.customer_email ||
    data?.email ||
    "";

  const last_transaction_id =
    subscription?.last_transaction_id ||
    root?.order?.id ||
    data?.id ||
    "";

  return {
    sub_id,
    sub_period_start,
    sub_period_end,
    customer_email,
    last_transaction_id,
  };
}

export function orderStatusIsPaid(status: string): boolean {
  return status === "paid";
}
