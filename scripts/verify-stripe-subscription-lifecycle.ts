import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db";
import {
  credits,
  orders,
  subscriptionEvents,
  subscriptions,
} from "../src/db/schema";
import { handleStripeWebhookEvent } from "../src/services/stripe-subscription";

if (process.env.CLOUDFLARE_D1_TOKEN) {
  throw new Error("Refusing to run lifecycle regression against remote D1");
}
process.env.STRIPE_PRIVATE_KEY ||= "sk_test_local_regression";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
const orderNo = `test_stripe_order_${suffix}`;
const userUuid = `test_stripe_user_${suffix}`;
const subscriptionId = `sub_test_${suffix}`;
const invoiceOne = `in_test_initial_${suffix}`;
const invoiceTwo = `in_test_renewal_${suffix}`;
const eventIds = [
  `evt_test_initial_${suffix}`,
  `evt_test_renewal_${suffix}`,
  `evt_test_canceled_${suffix}`,
];
const periodOneStart = 1_725_148_800;
const periodOneEnd = 1_727_740_800;
const periodTwoEnd = 1_730_332_800;

function subscriptionFixture(
  status: Stripe.Subscription.Status,
  periodStart: number,
  periodEnd: number
): Stripe.Subscription {
  return {
    id: subscriptionId,
    customer: `cus_test_${suffix}`,
    metadata: {
      order_no: orderNo,
      user_uuid: userUuid,
      product_id: "plus-monthly",
      interval: "month",
    },
    status,
    cancel_at_period_end: false,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    canceled_at: status === "canceled" ? periodEnd : null,
    ended_at: status === "canceled" ? periodEnd : null,
    billing_cycle_anchor: periodStart,
    items: {
      data: [
        {
          price: { recurring: { interval: "month", interval_count: 1 } },
        },
      ],
    },
  } as unknown as Stripe.Subscription;
}

function paidInvoiceEvent(
  eventId: string,
  invoiceId: string,
  billingReason: Stripe.Invoice.BillingReason,
  subscription: Stripe.Subscription,
  shape: "legacy" | "parent" = "legacy"
): Stripe.Event {
  const subscriptionFields =
    shape === "parent"
      ? {
          parent: {
            type: "subscription_details",
            subscription_details: {
              subscription,
              metadata: subscription.metadata,
            },
          },
        }
      : {
          subscription,
          subscription_details: { metadata: subscription.metadata },
        };

  return {
    id: eventId,
    type: "invoice.paid",
    data: {
      object: {
        id: invoiceId,
        status: "paid",
        ...subscriptionFields,
        customer_email: null,
        billing_reason: billingReason,
        amount_paid: 690,
        amount_due: 690,
        currency: "usd",
        status_transitions: { paid_at: subscription.current_period_start },
      },
    },
  } as unknown as Stripe.Event;
}

async function creditCount(): Promise<number> {
  const rows = await db()
    .select({ id: credits.id })
    .from(credits)
    .where(eq(credits.order_no, orderNo));
  return rows.length;
}

async function main() {
try {
  await db().insert(orders).values({
    order_no: orderNo,
    created_at: new Date(),
    user_uuid: userUuid,
    user_email: "",
    amount: 690,
    interval: "month",
    expired_at: new Date(periodOneEnd * 1000),
    status: "created",
    credits: 500,
    currency: "USD",
    product_id: "plus-monthly",
    product_name: "Plus Subscription - Monthly",
    valid_months: 1,
    pay_type: "stripe",
  });

  const firstSubscription = subscriptionFixture(
    "active",
    periodOneStart,
    periodOneEnd
  );
  const firstEvent = paidInvoiceEvent(
    eventIds[0],
    invoiceOne,
    "subscription_create",
    firstSubscription
  );
  await handleStripeWebhookEvent(firstEvent);
  await handleStripeWebhookEvent(firstEvent);
  assert((await creditCount()) === 1, "duplicate initial webhook must grant once");

  const renewalSubscription = subscriptionFixture(
    "active",
    periodOneEnd,
    periodTwoEnd
  );
  await handleStripeWebhookEvent(
    paidInvoiceEvent(
      eventIds[1],
      invoiceTwo,
      "subscription_cycle",
      renewalSubscription,
      "parent"
    )
  );
  assert((await creditCount()) === 2, "paid renewal must grant one new allowance");

  const canceledSubscription = subscriptionFixture(
    "canceled",
    periodOneEnd,
    periodTwoEnd
  );
  await handleStripeWebhookEvent({
    id: eventIds[2],
    type: "customer.subscription.deleted",
    data: { object: canceledSubscription },
  } as unknown as Stripe.Event);

  const [saved] = await db()
    .select({ status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.provider_subscription_id, subscriptionId));
  assert(saved?.status === "canceled", "cancellation must update subscription state");
  console.log("Stripe subscription lifecycle: OK");
} finally {
  await db().delete(credits).where(eq(credits.order_no, orderNo));
  await db()
    .delete(subscriptionEvents)
    .where(
      and(
        eq(subscriptionEvents.provider, "stripe"),
        eq(subscriptionEvents.order_no, orderNo)
      )
    );
  await db()
    .delete(subscriptions)
    .where(eq(subscriptions.provider_subscription_id, subscriptionId));
  await db().delete(orders).where(eq(orders.order_no, orderNo));
}
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
