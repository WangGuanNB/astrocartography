import type { subscriptions } from "@/db/schema";
import { insertCreditIfAbsent } from "@/models/credit";
import { findOrderByOrderNo } from "@/models/order";
import { findActiveSubscriptionByUser } from "@/models/subscription";

type SubscriptionRow = typeof subscriptions.$inferSelect;

function addUtcMonthsClamped(epochSeconds: number, months: number): number {
  const source = new Date(epochSeconds * 1000);
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth() + months;
  const day = source.getUTCDate();
  const hour = source.getUTCHours();
  const minute = source.getUTCMinutes();
  const second = source.getUTCSeconds();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Math.floor(
    Date.UTC(year, month, Math.min(day, lastDay), hour, minute, second) / 1000
  );
}

export function getAnnualCreditTranche(
  periodStart: number,
  periodEnd: number,
  nowSeconds: number
): { start: number; end: number } | null {
  if (nowSeconds < periodStart || nowSeconds >= periodEnd) {
    return null;
  }

  let trancheStart = periodStart;
  for (let index = 0; index < 12; index += 1) {
    const nextStart = Math.min(
      addUtcMonthsClamped(periodStart, index + 1),
      periodEnd
    );
    if (nowSeconds < nextStart || nextStart === periodEnd) {
      return { start: trancheStart, end: nextStart };
    }
    trancheStart = nextStart;
  }
  return null;
}

/**
 * Annual Stripe plans promise a monthly allowance but invoice only yearly.
 * Grant the current non-rollover tranche lazily on the user's first visit in
 * that month. The deterministic transaction key makes repeated visits safe.
 */
export async function ensureAnnualSubscriptionCreditsForUser(
  userUuid: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): Promise<boolean> {
  const subscription = await findActiveSubscriptionByUser(userUuid);
  if (
    !subscription ||
    subscription.provider !== "stripe" ||
    subscription.interval !== "year" ||
    subscription.last_paid_period_start !== subscription.current_period_start
  ) {
    return false;
  }

  const order = await findOrderByOrderNo(subscription.order_no);
  if (!order || order.status !== "paid" || order.credits <= 0) return false;

  const tranche = getAnnualCreditTranche(
    subscription.current_period_start!,
    subscription.current_period_end!,
    nowSeconds
  );
  if (!tranche) return false;

  const transNo = `stripe_annual_${subscription.provider_subscription_id}_${tranche.start}`;
  return await insertCreditIfAbsent({
    trans_no: transNo,
    created_at: new Date(),
    expired_at: new Date(tranche.end * 1000),
    user_uuid: order.user_uuid,
    trans_type: "order_pay",
    credits: order.credits,
    order_no: order.order_no,
  });
}
