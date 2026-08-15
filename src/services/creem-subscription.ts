/**
 * Creem subscription webhook helpers (Phase 1 — Plus monthly/yearly).
 */

import {
  findOrderByOrderNo,
  findOrderBySubId,
  OrderStatus,
  updateOrderStatus,
  updateOrderSubscription,
} from "@/models/order";
import { updateCreditForOrder, grantSubscriptionPeriodCredits } from "@/services/credit";
import { updateAffiliateForOrder } from "@/services/affiliate";
import { sendOrderConfirmationEmail } from "@/services/email";
import { getIsoTimestr } from "@/lib/time";
import { Order } from "@/types/order";
import { logCreemEvent, logCreemError } from "@/lib/paypal-logger";
import {
  extractCreemSubscriptionFields,
  isPlusProductId,
  isSubscriptionInterval,
} from "@/services/subscription";
import { getGaClientIdFromOrderDetail, reportPurchase } from "@/lib/ga4-server-events";

function periodEndIso(sub_period_end: number): string {
  return new Date(sub_period_end * 1000).toISOString();
}

async function markOrderPaidIfNeeded(
  order: NonNullable<Awaited<ReturnType<typeof findOrderByOrderNo>>>,
  paid_email: string,
  paid_detail: string
) {
  if (order.status === OrderStatus.Paid) return false;

  const paid_at = getIsoTimestr();
  await updateOrderStatus(
    order.order_no,
    OrderStatus.Paid,
    paid_at,
    paid_email,
    paid_detail
  );
  void reportPurchase({
    provider: "creem",
    transactionId: order.order_no,
    amount: order.amount,
    currency: order.currency,
    productId: order.product_id,
    productName: order.product_name,
    gaClientId: getGaClientIdFromOrderDetail(order.order_detail),
  });
  return true;
}

async function syncSubscriptionFields(
  order: NonNullable<Awaited<ReturnType<typeof findOrderByOrderNo>>>,
  fields: ReturnType<typeof extractCreemSubscriptionFields>,
  paid_detail: string,
  paid_email: string
) {
  const paid_at = getIsoTimestr();
  const sub_times = (order.sub_times || 0) + 1;

  await updateOrderSubscription(
    order.order_no,
    fields.sub_id,
    order.sub_interval_count || 1,
    order.sub_cycle_anchor || fields.sub_period_start,
    fields.sub_period_end,
    fields.sub_period_start,
    OrderStatus.Paid,
    paid_at,
    sub_times,
    paid_email || order.user_email,
    paid_detail
  );
}

async function issueCreditsForSubscriptionOrder(
  order: NonNullable<Awaited<ReturnType<typeof findOrderByOrderNo>>>,
  fields: ReturnType<typeof extractCreemSubscriptionFields>
) {
  if (!order.user_uuid || order.credits <= 0) return;

  const expired_at = periodEndIso(fields.sub_period_end);
  const idempotency_key = fields.last_transaction_id
    ? `creem_sub_${fields.last_transaction_id}`
    : `creem_sub_${order.order_no}_${fields.sub_period_end}`;

  const granted = await grantSubscriptionPeriodCredits({
    user_uuid: order.user_uuid,
    credits: order.credits,
    order_no: order.order_no,
    expired_at,
    idempotency_key,
  });

  if (granted) {
    logCreemEvent("CREDITS_ISSUED", {
      order_no: order.order_no,
      credits: order.credits,
      message: idempotency_key,
    });
  }
}

/**
 * checkout.completed — first-time subscription or one-time (one-time unchanged).
 */
export async function handleCreemCheckoutCompleted(data: any) {
  const order_no =
    data?.object?.request_id ||
    data?.request_id ||
    data?.object?.order_no ||
    data?.order_no ||
    data?.metadata?.order_no ||
    data?.object?.metadata?.order_no ||
    "";

  if (!order_no) {
    logCreemError("ORDER_NOT_FOUND", "checkout.completed missing request_id", {});
    return;
  }

  const order = await findOrderByOrderNo(order_no);
  if (!order) {
    logCreemError("ORDER_NOT_FOUND", "checkout.completed order not found", { order_no });
    return;
  }

  const paid_detail = JSON.stringify(data);
  const fields = extractCreemSubscriptionFields(data);
  const paid_email =
    fields.customer_email || order.user_email || order.paid_email || "";

  const isSub =
    isSubscriptionInterval(order.interval) || isPlusProductId(order.product_id);

  if (isSub && fields.sub_id) {
    await markOrderPaidIfNeeded(order, paid_email, paid_detail);
    await syncSubscriptionFields(order, fields, paid_detail, paid_email);
    await issueCreditsForSubscriptionOrder(order, fields);

    if (order.user_uuid) {
      try {
        await updateAffiliateForOrder(order as unknown as Order);
      } catch (e) {
        console.error("[Creem Sub] affiliate update failed:", e);
      }
    }

    if (paid_email) {
      try {
        await sendOrderConfirmationEmail({
          order: order as unknown as Order,
          customerEmail: paid_email,
        });
      } catch (e) {
        console.error("[Creem Sub] email failed:", e);
      }
    }

    logCreemEvent("WEBHOOK_COMPLETED", {
      order_no,
      message: fields.sub_id ? `sub_id=${fields.sub_id}` : undefined,
    });
    return;
  }

  if (isSub) {
    await markOrderPaidIfNeeded(order, paid_email, paid_detail);
    if (order.user_uuid && order.credits > 0) {
      await updateCreditForOrder(order as unknown as Order);
    }
    if (order.user_uuid) {
      await updateAffiliateForOrder(order as unknown as Order);
    }
    logCreemEvent("WEBHOOK_COMPLETED", {
      order_no,
      message: "subscription_fallback_no_sub_id",
    });
    return;
  }

  // Non-subscription: leave to existing one-time handler path if still Created
  if (order.status !== OrderStatus.Created) return;

  await markOrderPaidIfNeeded(order, paid_email, paid_detail);

  if (order.user_uuid && order.credits > 0) {
    await updateCreditForOrder(order as unknown as Order);
  }
  if (order.user_uuid) {
    await updateAffiliateForOrder(order as unknown as Order);
  }
  if (paid_email) {
    try {
      await sendOrderConfirmationEmail({
        order: order as unknown as Order,
        customerEmail: paid_email,
      });
    } catch (e) {
      console.error("[Creem Sub] email failed:", e);
    }
  }
}

/**
 * subscription.paid — initial (duplicate-safe) and renewals.
 */
export async function handleCreemSubscriptionPaid(data: any) {
  const fields = extractCreemSubscriptionFields(data);
  if (!fields.sub_id) {
    logCreemError("WEBHOOK_ERROR", "subscription.paid missing sub_id", {});
    return;
  }

  let order = await findOrderBySubId(fields.sub_id);

  if (!order) {
    const order_no =
      data?.request_id ||
      data?.object?.request_id ||
      data?.metadata?.order_no ||
      "";
    if (order_no) {
      order = await findOrderByOrderNo(order_no);
    }
  }

  if (!order) {
    logCreemError("ORDER_NOT_FOUND", "subscription.paid order not found", {
      message: fields.sub_id,
    });
    return;
  }

  const paid_detail = JSON.stringify(data);
  const paid_email =
    fields.customer_email || order.user_email || order.paid_email || "";

  await markOrderPaidIfNeeded(order, paid_email, paid_detail);
  await syncSubscriptionFields(order, fields, paid_detail, paid_email);
  await issueCreditsForSubscriptionOrder(order, fields);

  logCreemEvent("SUBSCRIPTION_PAID", {
    order_no: order.order_no,
    message: fields.sub_id,
  });
}

/** subscription.canceled / subscription.expired — keep access until period end. */
export async function handleCreemSubscriptionEnded(data: any, eventType: string) {
  const fields = extractCreemSubscriptionFields(data);
  if (!fields.sub_id) return;

  const order = await findOrderBySubId(fields.sub_id);
  if (!order) return;

  const paid_detail = JSON.stringify(data);
  const paid_at = getIsoTimestr();

  await updateOrderSubscription(
    order.order_no,
    fields.sub_id,
    order.sub_interval_count || 1,
    order.sub_cycle_anchor || fields.sub_period_start,
    fields.sub_period_end,
    fields.sub_period_start,
    OrderStatus.Paid,
    paid_at,
    order.sub_times || 1,
    order.paid_email || order.user_email,
    paid_detail
  );

  logCreemEvent("SUBSCRIPTION_ENDED", {
    order_no: order.order_no,
    message: `${eventType}:${fields.sub_id}`,
  });
}
