import Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe";
import {
  findOrderByOrderNo,
  incrementOrderSubscriptionTimes,
  syncOrderSubscriptionState,
} from "@/models/order";
import {
  beginSubscriptionEvent,
  failSubscriptionEvent,
  findSubscriptionByProviderId,
  finishSubscriptionEvent,
  markSubscriptionPeriodPaid,
  upsertSubscription,
} from "@/models/subscription";
import { grantSubscriptionPeriodCredits } from "@/services/credit";
import { fulfillPaidOrder, handleOrderSession } from "@/services/order";
import { ensureAnnualSubscriptionCreditsForUser } from "@/services/annual-subscription-credits";
import {
  getGaClientIdFromOrderDetail,
  reportPaymentFailed,
  reportPurchase,
  reportSubscriptionCancel,
} from "@/lib/ga4-server-events";

function objectId(value: { id: string } | string | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

function stripeMetadata(
  value: Stripe.Metadata | null | undefined
): Record<string, string> {
  return value ? { ...value } : {};
}

type StripeInvoiceCompat = Stripe.Invoice & {
  parent?: {
    subscription_details?: {
      subscription?: string | Stripe.Subscription | null;
      metadata?: Record<string, string> | null;
    } | null;
  } | null;
};

function invoiceSubscription(
  invoice: Stripe.Invoice
): string | Stripe.Subscription | null {
  const compatible = invoice as StripeInvoiceCompat;
  return (
    compatible.parent?.subscription_details?.subscription ||
    compatible.subscription ||
    null
  );
}

function invoiceSubscriptionMetadata(
  invoice: Stripe.Invoice
): Record<string, string> {
  const compatible = invoice as StripeInvoiceCompat;
  return stripeMetadata(
    compatible.parent?.subscription_details?.metadata ||
      compatible.subscription_details?.metadata
  );
}

async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  fallbackMetadata: Record<string, string> = {}
) {
  const existing = await findSubscriptionByProviderId("stripe", subscription.id);
  const metadata = {
    ...fallbackMetadata,
    ...stripeMetadata(subscription.metadata),
  };
  const orderNo = metadata.order_no || existing?.order_no || "";
  if (!orderNo) throw new Error("Stripe subscription is missing order_no metadata");

  const order = await findOrderByOrderNo(orderNo);
  if (!order) throw new Error(`Stripe subscription order not found: ${orderNo}`);

  const userUuid = metadata.user_uuid || existing?.user_uuid || order.user_uuid;
  const productId =
    metadata.product_id || existing?.product_id || order.product_id || "";
  const interval =
    subscription.items.data[0]?.price.recurring?.interval ||
    existing?.interval ||
    order.interval ||
    "month";
  const now = new Date();

  const row = await upsertSubscription({
    provider: "stripe",
    provider_subscription_id: subscription.id,
    provider_customer_id: objectId(subscription.customer),
    user_uuid: userUuid,
    order_no: orderNo,
    product_id: productId,
    interval,
    status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: subscription.current_period_start,
    current_period_end: subscription.current_period_end,
    last_paid_period_start: existing?.last_paid_period_start,
    last_paid_invoice_id: existing?.last_paid_invoice_id,
    last_paid_at: existing?.last_paid_at,
    canceled_at: subscription.canceled_at,
    ended_at: subscription.ended_at,
    created_at: existing?.created_at || now,
    updated_at: now,
  });

  await syncOrderSubscriptionState({
    order_no: orderNo,
    sub_id: subscription.id,
    interval_count:
      subscription.items.data[0]?.price.recurring?.interval_count || 1,
    cycle_anchor: subscription.billing_cycle_anchor,
    period_start: subscription.current_period_start,
    period_end: subscription.current_period_end,
    minimum_sub_times: order.status === "paid" ? 1 : 0,
  });

  return { row, order, metadata };
}

async function retrieveSubscription(
  stripe: Stripe,
  value: string | Stripe.Subscription | null
): Promise<Stripe.Subscription> {
  if (!value) throw new Error("Stripe subscription ID is missing");
  return typeof value === "string"
    ? await stripe.subscriptions.retrieve(value)
    : value;
}

/** Handles both webhook and success-page delivery without double fulfillment. */
export async function handleStripeCheckoutSession(
  session: Stripe.Checkout.Session
) {
  if (session.mode !== "subscription") {
    await handleOrderSession(session);
    return;
  }

  const stripe = getStripeClient();
  const subscription = await retrieveSubscription(stripe, session.subscription);
  await syncStripeSubscription(subscription, stripeMetadata(session.metadata));

  if (session.payment_status === "paid") {
    if (!session.metadata?.order_no) {
      throw new Error("Stripe Checkout Session is missing order_no metadata");
    }
    await fulfillPaidOrder({
      orderNo: session.metadata.order_no,
      paidEmail:
        session.customer_details?.email || session.customer_email || "",
      paidDetail: JSON.stringify({
        checkout_session_id: session.id,
        subscription_id: subscription.id,
        payment_status: session.payment_status,
      }),
      provider: "stripe",
      creditExpiresAt: new Date(
        subscription.current_period_end * 1000
      ).toISOString(),
      skipCredits: intervalFor(subscription) === "year",
    });
    await syncStripeSubscription(subscription, stripeMetadata(session.metadata));
  }
}

async function handlePaidInvoice(stripe: Stripe, invoice: Stripe.Invoice) {
  if (invoice.status !== "paid") throw new Error("invoice.paid event is not paid");

  const subscription = await retrieveSubscription(
    stripe,
    invoiceSubscription(invoice)
  );
  const invoiceMetadata = invoiceSubscriptionMetadata(invoice);
  const { order } = await syncStripeSubscription(subscription, invoiceMetadata);
  await markSubscriptionPeriodPaid({
    provider: "stripe",
    providerSubscriptionId: subscription.id,
    periodStart: subscription.current_period_start,
    invoiceId: invoice.id,
    paidAt: invoice.status_transitions.paid_at || Math.floor(Date.now() / 1000),
  });
  const paidEmail = invoice.customer_email || order.user_email || "";
  const detail = JSON.stringify({
    invoice_id: invoice.id,
    subscription_id: subscription.id,
    billing_reason: invoice.billing_reason,
    amount_paid: invoice.amount_paid,
    currency: invoice.currency,
  });

  const fulfillment = await fulfillPaidOrder({
    orderNo: order.order_no,
    paidEmail,
    paidDetail: detail,
    provider: "stripe",
    creditExpiresAt: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    skipCredits: intervalFor(subscription) === "year",
  });

  const isAnnual = intervalFor(subscription) === "year";
  if (isAnnual) {
    const granted = await ensureAnnualSubscriptionCreditsForUser(order.user_uuid);
    if (!fulfillment.newlyPaid && granted) {
      await incrementOrderSubscriptionTimes(order.order_no);
    }
  }

  if (fulfillment.newlyPaid || invoice.billing_reason === "subscription_create") {
    await syncOrderSubscriptionState({
      order_no: order.order_no,
      sub_id: subscription.id,
      interval_count:
        subscription.items.data[0]?.price.recurring?.interval_count || 1,
      cycle_anchor: subscription.billing_cycle_anchor,
      period_start: subscription.current_period_start,
      period_end: subscription.current_period_end,
      minimum_sub_times: 1,
    });
    return;
  }

  // Renewals: first payment already reported purchase via fulfillPaidOrder.
  // Use invoice.id so each period is a unique GA4 transaction.
  void reportPurchase({
    provider: "stripe",
    transactionId: invoice.id,
    amount: invoice.amount_paid || order.amount || 0,
    currency: invoice.currency || order.currency,
    productId: order.product_id,
    productName: order.product_name,
    gaClientId: getGaClientIdFromOrderDetail(order.order_detail),
  });

  if (isAnnual) return;

  const granted = await grantSubscriptionPeriodCredits({
    user_uuid: order.user_uuid,
    credits: order.credits,
    order_no: order.order_no,
    expired_at: new Date(subscription.current_period_end * 1000).toISOString(),
    idempotency_key: `stripe_invoice_${invoice.id}`,
  });
  if (granted) await incrementOrderSubscriptionTimes(order.order_no);
}

function intervalFor(
  subscription: Stripe.Subscription
): "day" | "week" | "month" | "year" | "" {
  return subscription.items.data[0]?.price.recurring?.interval || "";
}

function eventLedgerData(event: Stripe.Event) {
  const object = event.data.object as unknown as {
    id?: string;
    subscription?: string | { id: string } | null;
    metadata?: Record<string, string> | null;
    subscription_details?: { metadata?: Record<string, string> | null } | null;
    parent?: {
      subscription_details?: {
        subscription?: string | { id: string } | null;
        metadata?: Record<string, string> | null;
      } | null;
    } | null;
    amount_paid?: number;
    amount_due?: number;
    currency?: string;
  };
  const isSubscriptionObject = event.type.startsWith("customer.subscription.");
  const metadata =
    object.parent?.subscription_details?.metadata ||
    object.subscription_details?.metadata ||
    object.metadata ||
    {};
  const subscription =
    object.parent?.subscription_details?.subscription || object.subscription;

  return {
    provider: "stripe",
    provider_event_id: event.id,
    event_type: event.type,
    provider_subscription_id: isSubscriptionObject
      ? object.id || null
      : objectId(subscription),
    provider_invoice_id: event.type.startsWith("invoice.")
      ? object.id || null
      : null,
    user_uuid: metadata.user_uuid || null,
    order_no: metadata.order_no || null,
    amount: object.amount_paid ?? object.amount_due ?? null,
    currency: object.currency || null,
  };
}

export async function handleStripeWebhookEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    if (session.mode !== "subscription") {
      await handleOrderSession(session);
      return;
    }
  }

  const supported = new Set<Stripe.Event.Type>([
    "checkout.session.completed",
    "invoice.paid",
    "invoice.payment_failed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ]);
  if (!supported.has(event.type)) return;

  const ledger = eventLedgerData(event);
  const action = await beginSubscriptionEvent(ledger);
  if (action === "skip") return;

  try {
    const stripe = getStripeClient();
    switch (event.type) {
      case "checkout.session.completed":
        await handleStripeCheckoutSession(event.data.object);
        break;
      case "invoice.paid":
        await handlePaidInvoice(stripe, event.data.object);
        break;
      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscription = await retrieveSubscription(
          stripe,
          invoiceSubscription(invoice)
        );
        const { order } = await syncStripeSubscription(
          subscription,
          invoiceSubscriptionMetadata(invoice)
        );
        void reportPaymentFailed({
          provider: "stripe",
          transactionId: invoice.id,
          amount: invoice.amount_due || order.amount || 0,
          currency: invoice.currency || order.currency,
          productId: order.product_id,
          productName: order.product_name,
          gaClientId: getGaClientIdFromOrderDetail(order.order_detail),
          errorReason:
            invoice.last_finalization_error?.message ||
            invoice.billing_reason ||
            "invoice_payment_failed",
        });
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncStripeSubscription(event.data.object);
        break;
      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { order } = await syncStripeSubscription(subscription);
        void reportSubscriptionCancel({
          provider: "stripe",
          transactionId: subscription.id,
          amount: 0,
          currency: order.currency || "usd",
          productId: order.product_id,
          productName: order.product_name,
          gaClientId: getGaClientIdFromOrderDetail(order.order_detail),
        });
        break;
      }
    }
    await finishSubscriptionEvent("stripe", event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await failSubscriptionEvent("stripe", event.id, message);
    throw error;
  }
}
